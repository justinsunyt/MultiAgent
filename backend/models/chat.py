import base64
import os
import tempfile
from multion import SessionStepSuccess, SessionsScreenshotResponse
import replicate
import asyncio
from fastapi import WebSocket
from typing import List, Dict, Optional, Tuple
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

User: Schedule meeting based on my texts on Google Calendar.
Prompt: What is the exact meeting date and time agreed upon in the text? Who is this meeting with? What are the general meeting details?

User: Order this on Doordash.
Prompt: What type of food is in the image? List the exact ingredients. If no exact ingredients can be found, describe the general type of food.
###
"""

agent_prompt_generator_prompt = """
You are an AI agent expert.
The user has given a command related to some image.
Generate a prompt for an AI agent to complete the command given the information in the image.
If no specific details were mentioned but the image description is usable, still output a prompt.
If the image information is completely unusable, output [BAD IMAGE OUTPUT] and ask the user to clarify information about the image.

###
Examples:

User: Schedule meeting based on my texts on Google Calendar.
Image: The meeting is scheduled for Tuesday 6 PM with Jason.
Prompt: Schedule a meeting at 6 PM on Google Calendar and invite Jason.

User: Order this on Doordash.
Image: There is a cheeseburger with a slice of bacon, a meat patty, lettuce, and tomatoes.
Prompt: Order a cheeseburger on Doordash with a slice of bacon, a meat patty, lettuce, and tomatoes.

User: Order this outfit on Amazon.
Image: There is a black background.
Prompt: [BAD IMAGE OUTPUT] What kind of outfit is this?
###
"""

chat_prompt = """
You are a helpful conversational AI assistant. If the user asks you to accomplish some task, ask them to upload an image first so you can take a look. Otherwise, talk to them normally.
"""


class Chat(BaseModel):
    id: str
    owner: str
    model: str
    messages: List[Dict]
    last_chatted: Optional[str]
    session_id: Optional[str]


async def run_chat(
    websocket: WebSocket,
    supabase: Client,
    id: str,
    model: str,
    messages: List[Dict],
    session_id: Optional[str],
    uid: str,
):

    async def handle_response(
        response: SessionStepSuccess,
        get_screenshot: SessionsScreenshotResponse,
        agent_prompt: str,
        session_id: str,
    ) -> Tuple[SessionStepSuccess, SessionsScreenshotResponse]:
        print(response.message.strip())
        print(response.status)
        print(get_screenshot.screenshot)
        chat_message = {
            "type": "text",
            "role": "assistant",
            "content": response.message.strip(),
        }
        messages.append(chat_message)
        await websocket.send_json(chat_message)
        if get_screenshot.screenshot != "Unable to take screenshot for the session":
            screenshot_message = {
                "type": "file",
                "role": "assistant",
                "content": get_screenshot.screenshot,
            }
            messages.append(screenshot_message)
            await websocket.send_json(screenshot_message)

        date = datetime.now(timezone.utc)
        supabase.table("chats").update(
            {"messages": messages, "last_chatted": date.isoformat()}
        ).eq("id", id).execute()

        token_message = await websocket.receive_json()
        await decode_token(websocket, token_message["content"])
        continue_message = await websocket.receive_json()

        if response.status == "DONE":
            await websocket.send_json(
                {
                    "type": "text",
                    "role": "system",
                    "content": "Agent done",
                }
            )
            supabase.table("chats").update({"session_id": None}).eq("id", id).execute()

        if response.status == "NOT SURE":
            await websocket.send_json(
                {
                    "type": "text",
                    "role": "system",
                    "content": "Awaiting input",
                }
            )
            token_message = await websocket.receive_json()
            await decode_token(websocket, token_message["content"])
            new_user_message = await websocket.receive_json()
            messages.append(new_user_message)
            agent_prompt = new_user_message["content"]
            print(agent_prompt)
            await asyncio.sleep(0)
            response = multion.sessions.step(
                session_id=session_id,
                cmd=agent_prompt,
            )
            get_screenshot = multion.sessions.screenshot(session_id=session_id)

        if response.status == "CONTINUE":
            if continue_message["content"] == "Agent pause":
                print("Agent paused")
                await websocket.send_json(
                    {
                        "type": "text",
                        "role": "system",
                        "content": "Awaiting input",
                    }
                )
                token_message = await websocket.receive_json()
                await decode_token(websocket, token_message["content"])
                new_user_message = await websocket.receive_json()
                messages.append(new_user_message)
                agent_prompt = new_user_message["content"]
                print(agent_prompt)
            await asyncio.sleep(0)
            response = multion.sessions.step(
                session_id=session_id,
                cmd=agent_prompt,
            )
            get_screenshot = multion.sessions.screenshot(session_id=session_id)

        return response, get_screenshot

    while True:
        token_message = await websocket.receive_json()
        await decode_token(websocket, token_message["content"])
        message = await websocket.receive_json()

        if session_id:
            print(message["content"])
            messages.append(message)

            await websocket.send_json(
                {
                    "type": "text",
                    "role": "system",
                    "content": "Agent start",
                }
            )
            multion = MultiOn(api_key=os.getenv("MULTION_API_KEY"))
            agent_prompt = message["content"]
            response = multion.sessions.step(
                session_id=session_id,
                cmd=agent_prompt,
            )
            get_screenshot = multion.sessions.screenshot(session_id=session_id)

            while response:
                response, get_screenshot = await handle_response(
                    response, get_screenshot, agent_prompt, session_id
                )
                if response.status == "DONE":
                    session_id = None
                    break

        if message["type"] == "file":
            messages.append(message)
            user_message = await websocket.receive_json()
            print(user_message["content"])
            messages.append(user_message)
            image_prompt_generator_model = LLM(
                model="llama3-70b-8192",
                max_tokens=1024,
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
            if model == "llava-13b":
                stream_output = replicate.run(
                    "yorickvp/llava-13b:b5f6212d032508382d61ff00469ddda3e32fd8a0e75dc39d8a4191bb742157fb",
                    input={
                        "image": image_url,
                        "prompt": image_prompt,
                        "top_p": 1,
                        "max_tokens": 1024,
                        "temperature": 0.2,
                    },
                )
                image_output = ""
                for token in stream_output:
                    image_output += token
            if model == "llava-v1.6-34b":
                stream_output = replicate.run(
                    "yorickvp/llava-v1.6-34b:41ecfbfb261e6c1adf3ad896c9066ca98346996d7c4045c5bc944a79d430f174",
                    input={
                        "image": image_url,
                        "prompt": image_prompt,
                        "top_p": 1,
                        "max_tokens": 1024,
                        "temperature": 0.2,
                    },
                )
                image_output = ""
                for token in stream_output:
                    image_output += token
            if model == "qwen-vl-chat":
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
            if agent_prompt.startswith("[BAD IMAGE OUTPUT] "):
                clarification_message = {
                    "type": "text",
                    "role": "assistant",
                    "content": agent_prompt.lstrip("[BAD IMAGE OUTPUT] "),
                }
                messages.append(clarification_message)
                await websocket.send_json(clarification_message)
                token_message = await websocket.receive_json()
                await decode_token(websocket, token_message["content"])
                user_clarification_message = await websocket.receive_json()
                messages.append(user_clarification_message)
                agent_prompt = user_clarification_message["content"]
            agent_message = {
                "type": "text",
                "role": "assistant",
                "content": f"Creating agent: {agent_prompt}",
            }
            messages.append(agent_message)
            await websocket.send_json(agent_message)

            await websocket.send_json(
                {
                    "type": "text",
                    "role": "system",
                    "content": "Agent start",
                }
            )
            multion = MultiOn(api_key=os.getenv("MULTION_API_KEY"))
            response = multion.sessions.create(url="https://google.com", local=False)
            session_id = response.session_id
            get_screenshot = multion.sessions.screenshot(session_id=session_id)
            supabase.table("chats").update({"session_id": session_id}).eq(
                "id", id
            ).execute()

            while response:
                response, get_screenshot = await handle_response(
                    response, get_screenshot, agent_prompt, session_id
                )
                if response.status == "DONE":
                    session_id = None
                    break

        if message["type"] == "text":
            print(message["content"])
            message["content"] = f"""User: {message["content"]}\nAssistant: """
            messages.append(message)

            chat_model = LLM(
                model="llama3-70b-8192",
                max_tokens=1024,
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
