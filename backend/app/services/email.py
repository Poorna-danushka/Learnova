import logging
import httpx

from app.core.config import APP_ENV, RESEND_API_KEY, RESEND_FROM_EMAIL

logger = logging.getLogger(__name__)


class EmailConfigurationError(RuntimeError):
    """Raised when email delivery is required but not configured."""


class EmailDeliveryError(RuntimeError):
    """Raised when the email provider rejects or cannot receive a message."""


def ensure_email_configured() -> None:
    if RESEND_API_KEY and RESEND_FROM_EMAIL:
        return
    if APP_ENV == "production":
        raise EmailConfigurationError(
            "RESEND_API_KEY and RESEND_FROM_EMAIL must be configured in production."
        )


def send_email(*, to: str, subject: str, html: str) -> None:
    """Send an email through Resend, or explicitly no-op in development."""
    ensure_email_configured()
    if not RESEND_API_KEY or not RESEND_FROM_EMAIL:
        logger.info("Email delivery skipped: Resend is not configured (development).")
        return

    try:
        response = httpx.post(
            "https://api.resend.com/emails",
            headers={
                "Authorization": f"Bearer {RESEND_API_KEY}",
                "Content-Type": "application/json",
            },
            json={"from": RESEND_FROM_EMAIL, "to": [to], "subject": subject, "html": html},
            timeout=10,
        )
        response.raise_for_status()
    except httpx.TimeoutException as exc:
        logger.error("Resend email timeout: %s", exc.__class__.__name__)
        raise EmailDeliveryError("Email provider timed out.") from exc
    except httpx.HTTPStatusError as exc:
        logger.error(
            "Resend email rejected: status=%s body=%s",
            exc.response.status_code,
            exc.response.text,
        )
        if 400 <= exc.response.status_code < 500 and APP_ENV != "production":
            logger.warning(
                "Email delivery to '%s' skipped in development due to Resend sandbox restriction (status %s). Account action completed.",
                to,
                exc.response.status_code,
            )
            return
        raise EmailDeliveryError("Email provider rejected the message.") from exc
    except httpx.RequestError as exc:
        logger.error("Resend email connection error: %s", exc.__class__.__name__)
        raise EmailDeliveryError("Email provider could not be reached.") from exc
