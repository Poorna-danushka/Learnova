from datetime import datetime, timedelta, timezone
from html import escape

from sqlalchemy.orm import Session

from app.core.config import (
    EMAIL_VERIFICATION_TOKEN_EXPIRE_HOURS,
    EMAIL_VERIFICATION_URL,
    PASSWORD_RESET_TOKEN_EXPIRE_MINUTES,
    PASSWORD_RESET_URL,
)
from app.core.security import generate_account_token
from app.models.account_token import AccountToken
from app.models.user import User
from app.services.email import send_email

VERIFICATION_PURPOSE = "email_verification"
PASSWORD_RESET_PURPOSE = "password_reset"


def issue_account_token(
    db: Session, user_id: int, purpose: str, expires_at: datetime
) -> str:
    now = datetime.now(timezone.utc)
    db.query(AccountToken).filter(
        AccountToken.user_id == user_id,
        AccountToken.purpose == purpose,
        AccountToken.used_at.is_(None),
    ).update({AccountToken.used_at: now}, synchronize_session=False)
    token, token_hash = generate_account_token()
    db.add(
        AccountToken(
            user_id=user_id,
            purpose=purpose,
            token_hash=token_hash,
            expires_at=expires_at,
        )
    )
    return token


def issue_verification_token(db: Session, user: User) -> str:
    return issue_account_token(
        db,
        user.id,
        VERIFICATION_PURPOSE,
        datetime.now(timezone.utc)
        + timedelta(hours=EMAIL_VERIFICATION_TOKEN_EXPIRE_HOURS),
    )


def issue_password_reset_token(db: Session, user: User) -> str:
    return issue_account_token(
        db,
        user.id,
        PASSWORD_RESET_PURPOSE,
        datetime.now(timezone.utc)
        + timedelta(minutes=PASSWORD_RESET_TOKEN_EXPIRE_MINUTES),
    )


def send_verification_email(user: User, token: str) -> None:
    name = escape(user.full_name)
    send_email(
        to=user.email,
        subject="Verify your Nexora email",
        html=(
            f"<p>Hi {name},</p>"
            f'<p><a href="{EMAIL_VERIFICATION_URL}?token={token}">'
            "Verify your email address</a></p>"
            f"<p>This link expires in {EMAIL_VERIFICATION_TOKEN_EXPIRE_HOURS} hours.</p>"
        ),
    )


def send_password_reset_email(user: User, token: str) -> None:
    name = escape(user.full_name)
    send_email(
        to=user.email,
        subject="Reset your Nexora password",
        html=(
            f"<p>Hi {name},</p>"
            f'<p><a href="{PASSWORD_RESET_URL}?token={token}">'
            "Reset your password</a></p>"
            f"<p>This link expires in {PASSWORD_RESET_TOKEN_EXPIRE_MINUTES} minutes.</p>"
        ),
    )
