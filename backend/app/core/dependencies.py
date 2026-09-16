from typing import Annotated
from uuid import UUID

import jwt
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy.orm import Session

from app.core.config import JWT_ALGORITHM, JWT_SECRET
from app.database.database import get_db
from app.models.refresh_session import RefreshSession
from app.models.user import User

bearer_scheme = HTTPBearer()


def get_current_token_payload(
    credentials: Annotated[HTTPAuthorizationCredentials, Depends(bearer_scheme)],
    db: Annotated[Session, Depends(get_db)],
) -> dict:
    unauthorized = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Invalid or expired authentication token.",
        headers={"WWW-Authenticate": "Bearer"},
    )

    try:
        payload = jwt.decode(
            credentials.credentials,
            JWT_SECRET,
            algorithms=[JWT_ALGORITHM],
            options={
                "require": ["sub", "sid", "jti", "iat", "exp", "token_type", "type"],
            },
        )
        user_id = payload.get("sub")
        session_id = payload.get("sid")
        if (
            not isinstance(user_id, str)
            or not user_id.isdigit()
            or int(user_id) <= 0
            or not isinstance(session_id, str)
            or str(UUID(session_id)) != session_id
            or payload.get("token_type") != "access"
            or payload.get("type") != "access"
            or not isinstance(payload.get("jti"), str)
        ):
            raise unauthorized
        session = db.get(RefreshSession, session_id)
        if session is None or session.revoked_at is not None:
            raise unauthorized
        if session.user_id != int(user_id):
            raise unauthorized
    except (jwt.InvalidTokenError, ValueError, TypeError, OverflowError):
        raise unauthorized

    return payload


def get_current_user(
    payload: Annotated[dict, Depends(get_current_token_payload)],
    db: Annotated[Session, Depends(get_db)],
) -> User:
    unauthorized = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Invalid or expired authentication token.",
        headers={"WWW-Authenticate": "Bearer"},
    )
    user = db.get(User, int(payload["sub"]))
    if user is None:
        raise unauthorized
    return user
