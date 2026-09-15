from datetime import datetime, timedelta, timezone
from time import monotonic
from uuid import uuid4

from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy.orm import Session

from app.core.config import JWT_ACCESS_TOKEN_EXPIRE_MINUTES, JWT_REFRESH_TOKEN_EXPIRE_DAYS
from app.core.dependencies import get_current_token_payload
from app.core.security import (
    create_access_token,
    generate_refresh_token,
    hash_refresh_token,
    verify_password,
)
from app.database.database import get_db
from app.models.refresh_session import RefreshSession, RefreshToken
from app.models.user import User
from app.schemas.auth import LoginRequest, RefreshRequest, TokenResponse

router = APIRouter(prefix="/auth", tags=["authentication"])
_failed_logins: dict[str, list[float]] = {}
_MAX_FAILED_LOGINS = 5
_FAILED_LOGIN_WINDOW_SECONDS = 60


def _check_login_rate_limit(client_key: str) -> None:
    now = monotonic()
    recent_failures = [
        timestamp
        for timestamp in _failed_logins.get(client_key, [])
        if now - timestamp < _FAILED_LOGIN_WINDOW_SECONDS
    ]
    _failed_logins[client_key] = recent_failures
    if len(recent_failures) >= _MAX_FAILED_LOGINS:
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="Too many failed login attempts. Try again later.",
            headers={"Retry-After": str(_FAILED_LOGIN_WINDOW_SECONDS)},
        )


def _record_failed_login(client_key: str) -> None:
    _failed_logins.setdefault(client_key, []).append(monotonic())


def _unauthorized(detail: str = "Invalid or expired refresh token.") -> HTTPException:
    return HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail=detail,
        headers={"WWW-Authenticate": "Bearer"},
    )


def _issue_access_token(user_id: int, session_id: str) -> tuple[str, datetime]:
    issued_at = datetime.now(timezone.utc)
    expires_at = issued_at + timedelta(minutes=JWT_ACCESS_TOKEN_EXPIRE_MINUTES)
    return (
        create_access_token(
            user_id=user_id,
            session_id=session_id,
            issued_at=issued_at,
            expires_at=expires_at,
        ),
        expires_at,
    )


def _token_response(
    db: Session,
    user: User,
    session_id: str,
    refresh_token: str,
    refresh_expires_at: datetime,
) -> TokenResponse:
    access_token, access_expires_at = _issue_access_token(user.id, session_id)
    db.commit()
    return TokenResponse(
        access_token=access_token,
        refresh_token=refresh_token,
        expires_at=access_expires_at,
        refresh_expires_at=refresh_expires_at,
    )


@router.post("/login", response_model=TokenResponse)
def login(
    request: Request,
    credentials: LoginRequest,
    db: Session = Depends(get_db),
):
    client_host = request.client.host if request.client else "unknown"
    normalized_email = str(credentials.email).lower()
    client_key = f"{client_host}:{normalized_email}"
    _check_login_rate_limit(client_key)
    user = db.query(User).filter(User.email == normalized_email).first()
    if user is None or not verify_password(credentials.password, user.password_hash):
        _record_failed_login(client_key)
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    _failed_logins.pop(client_key, None)
    now = datetime.now(timezone.utc)
    refresh_expires_at = now + timedelta(days=JWT_REFRESH_TOKEN_EXPIRE_DAYS)
    session = RefreshSession(id=str(uuid4()), user_id=user.id)
    refresh_token, refresh_token_hash = generate_refresh_token()
    db.add(session)
    db.add(
        RefreshToken(
            session_id=session.id,
            token_hash=refresh_token_hash,
            expires_at=refresh_expires_at,
        )
    )
    return _token_response(
        db, user, session.id, refresh_token, refresh_expires_at
    )


@router.post("/refresh", response_model=TokenResponse)
def refresh(
    request: RefreshRequest,
    db: Session = Depends(get_db),
):
    now = datetime.now(timezone.utc)
    stored_token = (
        db.query(RefreshToken)
        .filter(RefreshToken.token_hash == hash_refresh_token(request.refresh_token))
        .with_for_update()
        .first()
    )
    if stored_token is None:
        raise _unauthorized()

    session = db.get(RefreshSession, stored_token.session_id)
    if session is None:
        raise _unauthorized()

    # A revoked token being presented again is a replay. Revoke the whole
    # session so a stolen token cannot keep rotating the session.
    if stored_token.revoked_at is not None:
        session.revoked_at = now
        db.commit()
        raise _unauthorized("Refresh token reuse detected.")

    expires_at = stored_token.expires_at
    if expires_at.tzinfo is None:
        expires_at = expires_at.replace(tzinfo=timezone.utc)
    if session.revoked_at is not None or expires_at <= now:
        raise _unauthorized()

    user = db.get(User, session.user_id)
    if user is None:
        session.revoked_at = now
        db.commit()
        raise _unauthorized()

    stored_token.revoked_at = now
    new_refresh_token, new_refresh_hash = generate_refresh_token()
    new_refresh_expires_at = now + timedelta(days=JWT_REFRESH_TOKEN_EXPIRE_DAYS)
    db.add(
        RefreshToken(
            session_id=session.id,
            token_hash=new_refresh_hash,
            expires_at=new_refresh_expires_at,
        )
    )
    return _token_response(
        db,
        user,
        session.id,
        new_refresh_token,
        new_refresh_expires_at,
    )


@router.post("/logout")
def logout(
    payload: dict = Depends(get_current_token_payload),
    db: Session = Depends(get_db),
):
    session = db.get(RefreshSession, payload["sid"])
    if session is not None and session.revoked_at is None:
        session.revoked_at = datetime.now(timezone.utc)
        db.commit()
    return {"message": "Successfully signed out."}
