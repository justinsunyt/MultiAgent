from typing import Annotated
from fastapi import Request, HTTPException, WebSocket, WebSocketException, Query, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials

from .auth_handler import decode_jwt


async def decode_token(
    websocket: WebSocket,
    token: Annotated[str | None, Query()] = None,
):
    if token is None:
        raise WebSocketException(code=403, reason="Invalid authentication scheme")
    if not decode_jwt(token):
        raise WebSocketException(code=403, reason="Invalid token or expired token")
    websocket.app.supabase.auth.set_session(token, "lol")
    return decode_jwt(token)


class JWTBearer(HTTPBearer):
    def __init__(self, auto_error: bool = True):
        super(JWTBearer, self).__init__(auto_error=auto_error)

    async def __call__(
        self,
        request: Request = None,
    ):
        credentials: HTTPAuthorizationCredentials = await super(
            JWTBearer, self
        ).__call__(request)
        if credentials:
            if not credentials.scheme == "Bearer":
                raise HTTPException(
                    status_code=403, detail="Invalid authentication scheme"
                )
            if not decode_jwt(credentials.credentials):
                raise HTTPException(
                    status_code=403, detail="Invalid token or expired token"
                )
            request.app.supabase.auth.set_session(credentials.credentials, "lol")
            return decode_jwt(credentials.credentials)
        else:
            raise HTTPException(status_code=403, detail="Invalid authorization code")
