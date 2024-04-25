import base64
import os
import tempfile
import replicate
import asyncio
from fastapi import WebSocket
from typing import List, Dict, Optional
from pydantic import BaseModel
from supabase import Client
from datetime import datetime, timezone
from auth.auth_bearer import decode_token
from models.llm import LLM
from multion.client import MultiOn

image_prompt_generator_prompt = """
You are a visual language AI model expert.
The user has given a command related to some image.
Generate a prompt for a VLM to get the most relevant information from the image for the corresponding command.
Always ask the model to provide general details if no specific information can be gathered.

###
Examples:

User: Schedule meeting based on my texts.
Prompt: What is the exact meeting date and time agreed upon in the text? Who is this meeting with? What are the general meeting details?

User: Order food.
Prompt: What type of food is in the image? List the exact ingredients. If no exact ingredients can be found, describe the general type of food.
###
"""

agent_prompt_generator_prompt = """
You are an AI agent expert.
The user has given a command related to some image.
Generate a prompt for an AI agent to complete the command given the information in the image.

###
Examples:

User: Schedule meeting based on my texts.
Image: The meeting is scheduled for Tuesday 6 PM with Jason.
Prompt: Schedule a meeting at 6 PM on Google Calendar and invite Jason.

User: Order food.
Image: There is a cheeseburger with a slice of bacon, a meat patty, lettuce, and tomatoes.
Prompt: Order a cheeseburger on Doordash with a slice of bacon, a meat patty, lettuce, and tomatoes.
###
"""


class Chat(BaseModel):
    id: str
    owner: str
    model: str
    messages: List[Dict]
    last_chatted: Optional[str]


async def run_chat(
    websocket: WebSocket,
    supabase: Client,
    id: str,
    model: str,
    messages: List[Dict],
    uid: str,
):

    while True:
        token = await websocket.receive_json()
        await decode_token(websocket, token)
        message = await websocket.receive_json()
        if message["type"] == "file":
            messages.append(message)
            user_message = await websocket.receive_json()
            print(user_message["content"])
            messages.append(user_message)
            image_prompt_generator_model = LLM(
                model="llama3-70b-8192",
                max_tokens=1000,
                temperature=0.2,
                system=image_prompt_generator_prompt,
            )
            image_prompt = image_prompt_generator_model.run(
                [
                    {
                        "role": "user",
                        "content": f"User: {user_message['content']}\nPrompt:",
                    }
                ]
            )
            print(f"Image prompt: {image_prompt}")

            image_data = base64.b64decode(message["content"].split(",")[1])
            with tempfile.NamedTemporaryFile(delete=False, suffix=".jpg") as tmp:
                tmp.write(image_data)
                tmp.flush()
                print(f"Temporary image path: {tmp.name}")
                image_path = f"{uid}/{id}/{len(messages)}.jpg"
            with open(tmp.name, "rb") as f:
                supabase.storage.from_("images").upload(
                    file=f,
                    path=image_path,
                    file_options={
                        "content-type": "image/jpg",
                        "cache-control": "3600",
                        "upsert": "true",
                    },
                )
            os.remove(tmp.name)
            image_url = supabase.storage.from_("images").get_public_url(image_path)
            print(f"Public image URL: {image_url}")
            if model == "qwen-vl":
                image_output = replicate.run(
                    "lucataco/qwen-vl-chat:50881b153b4d5f72b3db697e2bbad23bb1277ab741c5b52d80cd6ee17ea660e9",
                    input={
                        "image": image_url,
                        "prompt": image_prompt,
                    },
                )
            print(f"Image output: {image_output}")

            agent_prompt_generator_model = LLM(
                model="llama3-70b-8192",
                max_tokens=1000,
                temperature=0.2,
                system=agent_prompt_generator_prompt,
            )
            agent_prompt = agent_prompt_generator_model.run(
                [
                    {
                        "role": "user",
                        "content": f"User: {user_message['content']}\nImage: {image_output}\nPrompt:",
                    }
                ]
            )
            print(f"Agent prompt: {agent_prompt}")
            agent_message = {
                "type": "text",
                "role": "assistant",
                "content": f"Creating agent: {agent_prompt}",
            }
            messages.append(agent_message)
            await websocket.send_json(agent_message)

            multion = MultiOn(api_key=os.getenv("MULTION_API_KEY"))
            response = multion.sessions.create(url="https://google.com", local=False)
            session_id = response.session_id
            while response:
                print(response.message.strip())
                print(response.status)
                chat_message = {
                    "type": "text",
                    "role": "assistant",
                    "content": response.message.strip(),
                }
                messages.append(chat_message)
                await websocket.send_json(chat_message)

                date = datetime.now(timezone.utc)
                supabase.table("chats").update(
                    {"messages": messages, "last_chatted": date.isoformat()}
                ).eq("id", id).execute()

                if response.status == "NOT SURE":
                    await websocket.send_json(
                        {
                            "type": "text",
                            "role": "system",
                            "content": "Awaiting input",
                        }
                    )
                    token = await websocket.receive_json()
                    await decode_token(websocket, token)
                    new_user_message = await websocket.receive_json()
                    messages.append(new_user_message)
                    agent_prompt = new_user_message["content"]

                await asyncio.sleep(0)

                response = multion.sessions.step(
                    session_id=session_id,
                    cmd=agent_prompt,
                )

        if message["type"] == "text":
            print(message["content"])
            message["content"] = f"""User: {message["content"]}\nAssistant: """
            messages.append(message)

            chat_prompt = "You are a helpful AI assistant. If the user asks you to accomplish some task, ask them to upload an image first."
            chat_model = LLM(
                model="llama3-70b-8192",
                max_tokens=1000,
                temperature=0.2,
                system=chat_prompt,
            )
            filtered_messages = [m for m in messages if m["type"] == "text"]
            chat_output = chat_model.run(
                [
                    {k: message[k] for k in ("role", "content")}
                    for message in filtered_messages
                ]
            )
            print(chat_output)
            chat_message = {"type": "text", "role": "assistant", "content": chat_output}
            messages.append(chat_message)
            await websocket.send_json(chat_message)

            date = datetime.now(timezone.utc)
            supabase.table("chats").update(
                {"messages": messages, "last_chatted": date.isoformat()}
            ).eq("id", id).execute()


def create_chat(supabase: Client, model: str, uid: str) -> Chat | None:
    response = (
        supabase.table("chats")
        .insert(
            {
                "owner": uid,
                "model": model,
                "messages": [],
            }
        )
        .execute()
    )
    if response.data:
        chat = Chat(**response.data[0])
        return chat
    else:
        return None


def delete_chat(
    supabase: Client,
    id: str,
) -> bool | None:
    response = supabase.table("chats").delete().eq("id", id).execute()
    if response.data:
        return True
    else:
        return None


def get_chats_by_model(
    supabase: Client, uid: str, model: str
) -> List[Chat] | List[None]:
    response = (
        supabase.table("chats")
        .select("*")
        .eq("owner", uid)
        .eq("model", model)
        .order("last_chatted", desc=True)
        .execute()
    )
    if response.data:
        return [Chat(**chat) for chat in response.data]
    else:
        return []


def get_chat(supabase: Client, id: str) -> Chat | None:
    response = supabase.table("chats").select("*").eq("id", id).execute()
    if response.data:
        return Chat(**response.data[0])
    else:
        return None
