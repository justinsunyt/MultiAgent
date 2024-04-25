import os
import jwt
from dotenv import load_dotenv

load_dotenv(True)

jwt_secret = os.getenv("SUPABASE_JWT_SECRET")
jwt_algorithm = "HS256"
jwt_issuer = os.getenv("SUPABASE_JWT_ISSUER")


def decode_jwt(token: str) -> dict:
    try:
        payload = jwt.decode(
            token,
            jwt_secret,
            algorithms=[jwt_algorithm],
            issuer=jwt_issuer,
            audience="authenticated",
        )
        return payload
    except Exception as e:
        print(e)
        return {}
