import pytest
from fastapi.testclient import TestClient


def get_auth_headers(client: TestClient, email: str = "qa_user@example.com"):
    # Register user
    reg_res = client.post(
        "/users",
        json={
            "full_name": "QA User",
            "email": email,
            "password": "QAPassword123!",
            "university": "QA University",
            "degree": "Engineering",
            "graduation_year": 2026,
        },
    )
    assert reg_res.status_code in (201, 400)

    # Login user
    login_res = client.post(
        "/auth/login",
        json={"email": email, "password": "QAPassword123!"},
    )
    assert login_res.status_code == 200
    token = login_res.json()["access_token"]
    return {"Authorization": f"Bearer {token}"}


def test_health(client: TestClient):
    response = client.get("/health")
    assert response.status_code == 200
    assert response.json()["status"] == "online"


def test_auth_and_user_me(client: TestClient):
    headers = get_auth_headers(client, "me_user@example.com")
    res = client.get("/users/me", headers=headers)
    assert res.status_code == 200
    assert res.json()["email"] == "me_user@example.com"


def test_modules_crud(client: TestClient):
    headers = get_auth_headers(client, "modules_user@example.com")

    # Create module
    res = client.post(
        "/modules",
        json={"name": "Mathematics", "description": "Calculus & Algebra", "color": "#0EA5A0"},
        headers=headers,
    )
    assert res.status_code == 201
    module = res.json()
    module_id = module["id"]
    assert module["name"] == "Mathematics"

    # List modules
    res = client.get("/modules", headers=headers)
    assert res.status_code == 200
    assert len(res.json()) >= 1

    # Get single module
    res = client.get(f"/modules/{module_id}", headers=headers)
    assert res.status_code == 200
    assert res.json()["id"] == module_id

    # Update module
    res = client.patch(f"/modules/{module_id}", json={"progress": 50}, headers=headers)
    assert res.status_code == 200
    assert res.json()["progress"] == 50

    # Delete module
    res = client.delete(f"/modules/{module_id}", headers=headers)
    assert res.status_code == 204


def test_notes_crud_and_module_filter(client: TestClient):
    headers = get_auth_headers(client, "notes_user@example.com")

    # Create module
    m_res = client.post(
        "/modules",
        json={"name": "Physics", "color": "#8B5CF6"},
        headers=headers,
    )
    assert m_res.status_code == 201
    module_id = m_res.json()["id"]

    # Create note
    n_res = client.post(
        "/notes",
        json={"module_id": module_id, "title": "Newton Laws", "content": "1st, 2nd, and 3rd laws of motion."},
        headers=headers,
    )
    assert n_res.status_code == 201
    note_id = n_res.json()["id"]

    # List notes with module_id filter
    n_list = client.get(f"/notes?module_id={module_id}", headers=headers)
    assert n_list.status_code == 200
    assert len(n_list.json()) == 1
    assert n_list.json()[0]["id"] == note_id

    # Get single note
    n_get = client.get(f"/notes/{note_id}", headers=headers)
    assert n_get.status_code == 200
    assert n_get.json()["title"] == "Newton Laws"

    # Delete note
    n_del = client.delete(f"/notes/{note_id}", headers=headers)
    assert n_del.status_code == 204


def test_study_materials_crud_and_module_filter(client: TestClient):
    headers = get_auth_headers(client, "materials_user@example.com")

    # Create module
    m_res = client.post(
        "/modules",
        json={"name": "Chemistry", "color": "#10B981"},
        headers=headers,
    )
    assert m_res.status_code == 201
    module_id = m_res.json()["id"]

    # Upload material (verifies module_id query parameter)
    files = {"file": ("notes.txt", b"Organic Chemistry Notes Content", "text/plain")}
    mat_res = client.post(f"/study-materials?module_id={module_id}", files=files, headers=headers)
    assert mat_res.status_code == 201
    material_id = mat_res.json()["id"]
    assert mat_res.json()["module_id"] == module_id

    # List materials with module_id filter (verifies NameError fix)
    list_res = client.get(f"/study-materials?module_id={module_id}", headers=headers)
    assert list_res.status_code == 200
    assert len(list_res.json()) == 1
    assert list_res.json()[0]["id"] == material_id

    # Delete material
    del_res = client.delete(f"/study-materials/{material_id}", headers=headers)
    assert del_res.status_code == 204


def test_quizzes_crud_and_module_filter(client: TestClient):
    headers = get_auth_headers(client, "quizzes_user@example.com")

    # Create module
    m_res = client.post(
        "/modules",
        json={"name": "Biology", "color": "#F59E0B"},
        headers=headers,
    )
    assert m_res.status_code == 201
    module_id = m_res.json()["id"]

    # Create quiz
    q_res = client.post(
        "/quizzes",
        json={"module_id": module_id, "title": "Cell Biology Quiz", "description": "Mitochondria"},
        headers=headers,
    )
    assert q_res.status_code == 201
    quiz_id = q_res.json()["id"]

    # List quizzes with module_id filter
    q_list = client.get(f"/quizzes?module_id={module_id}", headers=headers)
    assert q_list.status_code == 200
    assert len(q_list.json()) == 1
    assert q_list.json()[0]["id"] == quiz_id

    # Get single quiz
    q_get = client.get(f"/quizzes/{quiz_id}", headers=headers)
    assert q_get.status_code == 200
    assert q_get.json()["title"] == "Cell Biology Quiz"

    # Delete quiz
    q_del = client.delete(f"/quizzes/{quiz_id}", headers=headers)
    assert q_del.status_code == 204


def test_study_sessions_and_goals(client: TestClient):
    headers = get_auth_headers(client, "planner_user@example.com")

    # Create session
    s_res = client.post(
        "/study-sessions",
        json={
            "title": "Evening Study",
            "scheduled_for": "2026-10-01T18:00:00Z",
            "duration_minutes": 90,
            "is_completed": False,
        },
        headers=headers,
    )
    assert s_res.status_code == 201

    # List sessions
    sessions = client.get("/study-sessions", headers=headers)
    assert sessions.status_code == 200
    assert len(sessions.json()) >= 1

    # Create goal
    g_res = client.post(
        "/study-goals",
        json={"title": "Master React Native", "is_completed": False},
        headers=headers,
    )
    assert g_res.status_code == 201

    # List goals
    goals = client.get("/study-goals", headers=headers)
    assert goals.status_code == 200
    assert len(goals.json()) >= 1


def test_calendar_and_reminders(client: TestClient):
    headers = get_auth_headers(client, "calendar_user@example.com")

    # Create calendar event
    c_res = client.post(
        "/calendar-events",
        json={
            "title": "Final Exam",
            "starts_at": "2026-12-15T09:00:00Z",
            "ends_at": "2026-12-15T11:00:00Z",
            "description": "Comprehensive Exam",
            "reminder_minutes": 30,
        },
        headers=headers,
    )
    assert c_res.status_code == 201
    event_id = c_res.json()["id"]

    # List calendar events
    c_list = client.get("/calendar-events", headers=headers)
    assert c_list.status_code == 200
    assert len(c_list.json()) >= 1

    # Delete calendar event
    c_del = client.delete(f"/calendar-events/{event_id}", headers=headers)
    assert c_del.status_code == 204


def test_user_profile_update_and_notifications(client: TestClient):
    headers = get_auth_headers(client, "profile_user@example.com")

    # Update profile
    p_res = client.patch(
        "/users/me",
        json={
            "full_name": "Updated QA User",
            "university": "Oxford University",
            "push_notifications_enabled": True,
        },
        headers=headers,
    )
    assert p_res.status_code == 200
    assert p_res.json()["full_name"] == "Updated QA User"
    assert p_res.json()["university"] == "Oxford University"

    # List notification history
    n_res = client.get("/notifications/history", headers=headers)
    assert n_res.status_code == 200
    assert "items" in n_res.json()


def test_ai_conversations_lifecycle(client: TestClient):
    headers = get_auth_headers(client, "ai_user@example.com")

    # Create AI conversation
    conv_res = client.post(
        "/ai/conversations",
        json={"title": "React Native Help"},
        headers=headers,
    )
    assert conv_res.status_code == 201
    conv_id = conv_res.json()["id"]

    # List conversations
    c_list = client.get("/ai/conversations", headers=headers)
    assert c_list.status_code == 200
    assert len(c_list.json()) >= 1

    # Send message in conversation (handles live provider network response)
    m_res = client.post(
        f"/ai/conversations/{conv_id}/messages",
        json={"role": "user", "content": "How does state work in React Native?"},
        headers=headers,
    )
    assert m_res.status_code in (200, 201, 502, 503)

    # Delete conversation
    d_res = client.delete(f"/ai/conversations/{conv_id}", headers=headers)
    assert d_res.status_code == 204


