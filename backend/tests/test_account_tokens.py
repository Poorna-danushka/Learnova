from datetime import datetime, timedelta, timezone

from app.models.account_token import AccountToken
from app.models.user import User


def _register(client, email="tokens@university.edu", password="securepassword123"):
    response = client.post(
        "/users",
        json={
            "full_name": "Token Student",
            "email": email,
            "password": password,
        },
    )
    assert response.status_code == 201
    assert response.json()["email_verified_at"] is None


def test_verification_token_is_expiring_and_single_use(client, db, monkeypatch):
    captured: list[str] = []
    monkeypatch.setattr(
        "app.routers.users.send_verification_email",
        lambda user, token: captured.append(token),
    )
    _register(client)
    token = captured[0]
    stored = db.query(AccountToken).filter(AccountToken.purpose == "email_verification").one()
    assert stored.expires_at > datetime.now(timezone.utc).replace(tzinfo=None)

    verified = client.post("/auth/verify-email", json={"token": token})
    assert verified.status_code == 200
    assert client.post("/auth/verify-email", json={"token": token}).status_code == 400
    assert db.query(User).one().email_verified_at is not None


def test_expired_verification_token_is_rejected(client, db, monkeypatch):
    captured: list[str] = []
    monkeypatch.setattr(
        "app.routers.users.send_verification_email",
        lambda user, token: captured.append(token),
    )
    _register(client, "expired@university.edu")
    stored = db.query(AccountToken).filter(AccountToken.purpose == "email_verification").one()
    stored.expires_at = datetime.now(timezone.utc) - timedelta(minutes=1)
    db.flush()
    assert client.post("/auth/verify-email", json={"token": captured[0]}).status_code == 400


def test_forgot_password_has_generic_response(client, monkeypatch):
    responses = []
    monkeypatch.setattr(
        "app.routers.users.send_verification_email", lambda user, token: None
    )
    monkeypatch.setattr(
        "app.routers.auth.send_password_reset_email",
        lambda user, token: None,
    )
    _register(client, "forgot@university.edu")
    responses.append(
        client.post("/auth/forgot-password", json={"email": "forgot@university.edu"}).json()
    )
    responses.append(
        client.post("/auth/forgot-password", json={"email": "missing@university.edu"}).json()
    )
    assert responses[0] == responses[1]


def test_password_reset_revokes_sessions_and_is_single_use(client, monkeypatch):
    captured: list[str] = []
    monkeypatch.setattr(
        "app.routers.users.send_verification_email", lambda user, token: None
    )
    monkeypatch.setattr(
        "app.routers.auth.send_password_reset_email",
        lambda user, token: captured.append(token),
    )
    password = "securepassword123"
    _register(client, "reset@university.edu", password)
    login = client.post(
        "/auth/login",
        json={"email": "reset@university.edu", "password": password},
    ).json()
    reset = client.post(
        "/auth/forgot-password", json={"email": "reset@university.edu"}
    )
    assert reset.status_code == 200
    changed = client.post(
        "/auth/reset-password",
        json={"token": captured[0], "new_password": "newsecurepassword123"},
    )
    assert changed.status_code == 200
    assert client.get(
        "/users/me", headers={"Authorization": f"Bearer {login['access_token']}"}
    ).status_code == 401
    assert (
        client.post(
            "/auth/reset-password",
            json={"token": captured[0], "new_password": "anotherpassword123"},
        ).status_code
        == 400
    )


def test_development_without_email_configuration_is_noop(client, monkeypatch):
    monkeypatch.setattr("app.services.email.RESEND_API_KEY", None)
    monkeypatch.setattr("app.services.email.RESEND_FROM_EMAIL", None)
    _register(client, "no-email@university.edu")
