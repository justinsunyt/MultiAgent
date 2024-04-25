from fastapi import APIRouter
from routes.chat_router import chat_router


router = APIRouter(responses={404: {"description": "Not found"}})

router.include_router(chat_router)
