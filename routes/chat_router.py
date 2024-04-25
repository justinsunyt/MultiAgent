from typing import Annotated
from fastapi import (
    APIRouter,
    File,
    Form,
    Request,
    UploadFile,
    WebSocket,
    HTTPException,
    WebSocketDisconnect,
    WebSocketException,
    Path,
    Depends,
)
from models.chat import (
    delete_chat,
    run_chat,
    create_chat,
    get_chats_by_model,
    get_chat,
)
from auth.auth_bearer import decode_token, JWTBearer

chat_router = APIRouter(
    prefix="/chat",
    tags=["chat"],
)


@chat_router.websocket("/run/{id}")
async def run_chat_handler(
    websocket: WebSocket,
    id: Annotated[str, Path(description="The ID of the chat to run")],
    user: Annotated[str, Depends(decode_token)],
):
    try:
        await websocket.accept()
        uid = user["sub"]
        chat = get_chat(websocket.app.supabase, id)
        if not chat:
            raise WebSocketException(code=404, reason="Chat not found")
        if chat and uid != chat.owner:
            raise WebSocketException(code=403, reason="User is not owner of chat")
        await run_chat(
            websocket,
            websocket.app.supabase,
            id,
            chat.model,
            chat.messages,
            uid,
        )
    except WebSocketDisconnect:
        print("Websocket disconnected")
    except Exception as e:
        print(e)
        await websocket.close(code=1008)


@chat_router.post("/create/{model}")
async def create_chat_handler(
    request: Request,
    model: Annotated[str, Path(description="The model of the chat to create")],
    user: dict = Depends(JWTBearer()),
):
    uid = user["sub"]
    response = create_chat(request.app.supabase, model, uid)
    return response


@chat_router.post("/delete/{id}")
async def delete_chat_handler(
    request: Request,
    id: Annotated[str, Path(description="The ID of the chat to delete")],
    user: dict = Depends(JWTBearer()),
):
    uid = user["sub"]
    chat = get_chat(request.app.supabase, id)
    if not chat:
        raise HTTPException(status_code=404, detail="Chat not found")
    if chat and uid != chat.owner:
        raise HTTPException(status_code=403, detail="User is not owner of chat")
    response = delete_chat(request.app.supabase, id)
    return response


@chat_router.get("/get_by_model/{model}")
async def get_chats_by_owner_handler(
    request: Request,
    model: Annotated[str, Path(description="The model of the chat to get")],
    user: dict = Depends(JWTBearer()),
):
    uid = user["sub"]
    response = get_chats_by_model(request.app.supabase, uid, model)
    return response


@chat_router.get("/get/{id}")
async def get_chat_handler(
    request: Request,
    id: Annotated[str, Path(description="The ID of the chat to get")],
    user: dict = Depends(JWTBearer()),
):
    uid = user["sub"]
    response = get_chat(request.app.supabase, id)
    if response and uid != response.owner:
        raise HTTPException(status_code=403, detail="User is not owner of chat")
    return response
