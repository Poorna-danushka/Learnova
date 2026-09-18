"""
Comprehensive API test script for Learnova backend
Tests all major features: auth, modules, notes, study sessions, calendar, reminders, AI, quizzes
"""
import requests
import json
from datetime import datetime, timedelta

BASE_URL = "http://127.0.0.1:8000"
TEST_EMAIL = f"test_user_{datetime.now().timestamp()}@test.com"
TEST_PASSWORD = "TestPassword123!"
TEST_NAME = "Test User"

# Global variables to store tokens and IDs
access_token = None
refresh_token = None
user_id = None
module_id = None
note_id = None
calendar_event_id = None
reminder_id = None
quiz_id = None
conversation_id = None

def print_test(test_name, passed, details=""):
    status = "✓ PASS" if passed else "✗ FAIL"
    print(f"{status} | {test_name}")
    if details:
        print(f"      {details}")
    if not passed:
        print("")

def print_section(section_name):
    print(f"\n{'='*60}")
    print(f"  {section_name}")
    print(f"{'='*60}")

# ────────────────────────────────────────────────────────────────────────────
# 1. AUTHENTICATION TESTS
# ────────────────────────────────────────────────────────────────────────────
def test_health_check():
    print_section("HEALTH CHECK")
    try:
        response = requests.get(f"{BASE_URL}/health")
        passed = response.status_code == 200 and response.json().get("status") == "online"
        print_test("Health check", passed, f"Status: {response.json()}")
        return passed
    except Exception as e:
        print_test("Health check", False, str(e))
        return False

def test_user_registration():
    print_section("USER REGISTRATION")
    global user_id
    try:
        data = {
            "full_name": TEST_NAME,
            "email": TEST_EMAIL,
            "password": TEST_PASSWORD,
            "university": "Test University",
            "degree": "Computer Science",
            "graduation_year": 2025
        }
        response = requests.post(f"{BASE_URL}/users", json=data)
        passed = response.status_code == 201
        if passed:
            user_data = response.json()
            user_id = user_data.get("id")
            print_test("User registration", True, f"User ID: {user_id}, Email: {user_data.get('email')}")
        else:
            print_test("User registration", False, f"Status: {response.status_code}, Response: {response.text}")
        return passed
    except Exception as e:
        print_test("User registration", False, str(e))
        return False

def test_user_login():
    print_section("USER LOGIN")
    global access_token, refresh_token
    try:
        data = {
            "email": TEST_EMAIL,
            "password": TEST_PASSWORD
        }
        response = requests.post(f"{BASE_URL}/auth/login", json=data)
        passed = response.status_code == 200
        if passed:
            tokens = response.json()
            access_token = tokens.get("access_token")
            refresh_token = tokens.get("refresh_token")
            print_test("User login", True, f"Access token received (length: {len(access_token)})")
        else:
            print_test("User login", False, f"Status: {response.status_code}, Response: {response.text}")
        return passed
    except Exception as e:
        print_test("User login", False, str(e))
        return False

def test_get_current_user():
    print_section("GET CURRENT USER")
    try:
        headers = {"Authorization": f"Bearer {access_token}"}
        response = requests.get(f"{BASE_URL}/users/me", headers=headers)
        passed = response.status_code == 200
        if passed:
            user_data = response.json()
            print_test("Get current user", True, f"Name: {user_data.get('full_name')}, Email: {user_data.get('email')}")
        else:
            print_test("Get current user", False, f"Status: {response.status_code}, Response: {response.text}")
        return passed
    except Exception as e:
        print_test("Get current user", False, str(e))
        return False

def test_token_refresh():
    print_section("TOKEN REFRESH")
    global access_token
    try:
        data = {"refresh_token": refresh_token}
        response = requests.post(f"{BASE_URL}/auth/refresh", json=data)
        passed = response.status_code == 200
        if passed:
            tokens = response.json()
            access_token = tokens.get("access_token")
            print_test("Token refresh", True, "New access token received")
        else:
            print_test("Token refresh", False, f"Status: {response.status_code}, Response: {response.text}")
        return passed
    except Exception as e:
        print_test("Token refresh", False, str(e))
        return False

# ────────────────────────────────────────────────────────────────────────────
# 2. MODULES TESTS
# ────────────────────────────────────────────────────────────────────────────
def test_create_module():
    print_section("CREATE MODULE")
    global module_id
    try:
        headers = {"Authorization": f"Bearer {access_token}"}
        data = {
            "name": "Test Module",
            "description": "Test module description",
            "color": "#0EA5A0",
            "progress": 0,
            "is_completed": False
        }
        response = requests.post(f"{BASE_URL}/modules", json=data, headers=headers)
        passed = response.status_code == 201
        if passed:
            module_data = response.json()
            module_id = module_data.get("id")
            print_test("Create module", True, f"Module ID: {module_id}, Name: {module_data.get('name')}")
        else:
            print_test("Create module", False, f"Status: {response.status_code}, Response: {response.text}")
        return passed
    except Exception as e:
        print_test("Create module", False, str(e))
        return False

def test_get_modules():
    print_section("GET MODULES")
    try:
        headers = {"Authorization": f"Bearer {access_token}"}
        response = requests.get(f"{BASE_URL}/modules", headers=headers)
        passed = response.status_code == 200 and isinstance(response.json(), list)
        if passed:
            modules = response.json()
            print_test("Get modules", True, f"Found {len(modules)} modules")
        else:
            print_test("Get modules", False, f"Status: {response.status_code}, Response: {response.text}")
        return passed
    except Exception as e:
        print_test("Get modules", False, str(e))
        return False

def test_update_module():
    print_section("UPDATE MODULE")
    try:
        headers = {"Authorization": f"Bearer {access_token}"}
        data = {"progress": 50, "description": "Updated description"}
        response = requests.patch(f"{BASE_URL}/modules/{module_id}", json=data, headers=headers)
        passed = response.status_code == 200
        if passed:
            module_data = response.json()
            print_test("Update module", True, f"Progress updated to: {module_data.get('progress')}%")
        else:
            print_test("Update module", False, f"Status: {response.status_code}, Response: {response.text}")
        return passed
    except Exception as e:
        print_test("Update module", False, str(e))
        return False

# ────────────────────────────────────────────────────────────────────────────
# 3. NOTES TESTS
# ────────────────────────────────────────────────────────────────────────────
def test_create_note():
    print_section("CREATE NOTE")
    global note_id
    try:
        headers = {"Authorization": f"Bearer {access_token}"}
        data = {
            "module_id": module_id,
            "title": "Test Note",
            "content": "This is a test note content",
            "is_favorite": False
        }
        response = requests.post(f"{BASE_URL}/notes", json=data, headers=headers)
        passed = response.status_code == 201
        if passed:
            note_data = response.json()
            note_id = note_data.get("id")
            print_test("Create note", True, f"Note ID: {note_id}, Title: {note_data.get('title')}")
        else:
            print_test("Create note", False, f"Status: {response.status_code}, Response: {response.text}")
        return passed
    except Exception as e:
        print_test("Create note", False, str(e))
        return False

def test_get_notes():
    print_section("GET NOTES")
    try:
        headers = {"Authorization": f"Bearer {access_token}"}
        response = requests.get(f"{BASE_URL}/notes", headers=headers)
        passed = response.status_code == 200 and isinstance(response.json(), list)
        if passed:
            notes = response.json()
            print_test("Get notes", True, f"Found {len(notes)} notes")
        else:
            print_test("Get notes", False, f"Status: {response.status_code}, Response: {response.text}")
        return passed
    except Exception as e:
        print_test("Get notes", False, str(e))
        return False

# ────────────────────────────────────────────────────────────────────────────
# 4. STUDY SESSIONS TESTS
# ────────────────────────────────────────────────────────────────────────────
def test_create_study_session():
    print_section("CREATE STUDY SESSION")
    try:
        headers = {"Authorization": f"Bearer {access_token}"}
        from datetime import datetime
        scheduled_for = (datetime.now() + timedelta(hours=2)).isoformat()
        data = {
            "subject_id": module_id,
            "title": "Test Study Session",
            "scheduled_for": scheduled_for,
            "duration_minutes": 60,
            "is_completed": False
        }
        response = requests.post(f"{BASE_URL}/study-sessions", json=data, headers=headers)
        passed = response.status_code == 201
        if passed:
            session_data = response.json()
            print_test("Create study session", True, f"Session ID: {session_data.get('id')}, Duration: {session_data.get('duration_minutes')} min")
        else:
            print_test("Create study session", False, f"Status: {response.status_code}, Response: {response.text}")
        return passed
    except Exception as e:
        print_test("Create study session", False, str(e))
        return False

def test_get_study_sessions():
    print_section("GET STUDY SESSIONS")
    try:
        headers = {"Authorization": f"Bearer {access_token}"}
        response = requests.get(f"{BASE_URL}/study-sessions", headers=headers)
        passed = response.status_code == 200 and isinstance(response.json(), list)
        if passed:
            sessions = response.json()
            print_test("Get study sessions", True, f"Found {len(sessions)} sessions")
        else:
            print_test("Get study sessions", False, f"Status: {response.status_code}, Response: {response.text}")
        return passed
    except Exception as e:
        print_test("Get study sessions", False, str(e))
        return False

# ────────────────────────────────────────────────────────────────────────────
# 5. CALENDAR EVENTS TESTS
# ────────────────────────────────────────────────────────────────────────────
def test_create_calendar_event():
    print_section("CREATE CALENDAR EVENT")
    global calendar_event_id
    try:
        headers = {"Authorization": f"Bearer {access_token}"}
        start_time = (datetime.now() + timedelta(days=1)).isoformat()
        end_time = (datetime.now() + timedelta(days=1, hours=2)).isoformat()
        data = {
            "title": "Test Event",
            "description": "Test calendar event",
            "starts_at": start_time,
            "ends_at": end_time,
            "all_day": False,
            "subject_id": module_id
        }
        response = requests.post(f"{BASE_URL}/calendar-events", json=data, headers=headers)
        passed = response.status_code == 201
        if passed:
            event_data = response.json()
            calendar_event_id = event_data.get("id")
            print_test("Create calendar event", True, f"Event ID: {calendar_event_id}, Title: {event_data.get('title')}")
        else:
            print_test("Create calendar event", False, f"Status: {response.status_code}, Response: {response.text}")
        return passed
    except Exception as e:
        print_test("Create calendar event", False, str(e))
        return False

def test_get_calendar_events():
    print_section("GET CALENDAR EVENTS")
    try:
        headers = {"Authorization": f"Bearer {access_token}"}
        response = requests.get(f"{BASE_URL}/calendar-events", headers=headers)
        passed = response.status_code == 200 and isinstance(response.json(), list)
        if passed:
            events = response.json()
            print_test("Get calendar events", True, f"Found {len(events)} events")
        else:
            print_test("Get calendar events", False, f"Status: {response.status_code}, Response: {response.text}")
        return passed
    except Exception as e:
        print_test("Get calendar events", False, str(e))
        return False

# ────────────────────────────────────────────────────────────────────────────
# 6. REMINDERS TESTS
# ────────────────────────────────────────────────────────────────────────────
def test_create_reminder():
    print_section("CREATE REMINDER")
    global reminder_id
    try:
        headers = {"Authorization": f"Bearer {access_token}"}
        from datetime import timezone as tz
        scheduled_at = (datetime.now(tz.utc) + timedelta(hours=1)).isoformat()
        data = {
            "title": "Test Reminder",
            "description": "Test reminder description",
            "scheduled_at": scheduled_at,
            "timezone": "America/New_York",
            "reminder_type": "general"
        }
        response = requests.post(f"{BASE_URL}/reminders", json=data, headers=headers)
        passed = response.status_code == 201
        if passed:
            reminder_data = response.json()
            reminder_id = reminder_data.get("id")
            print_test("Create reminder", True, f"Reminder ID: {reminder_id}, Title: {reminder_data.get('title')}")
        else:
            print_test("Create reminder", False, f"Status: {response.status_code}, Response: {response.text}")
        return passed
    except Exception as e:
        print_test("Create reminder", False, str(e))
        return False

def test_get_reminders():
    print_section("GET REMINDERS")
    try:
        headers = {"Authorization": f"Bearer {access_token}"}
        response = requests.get(f"{BASE_URL}/reminders", headers=headers)
        passed = response.status_code == 200 and isinstance(response.json(), list)
        if passed:
            reminders = response.json()
            print_test("Get reminders", True, f"Found {len(reminders)} reminders")
        else:
            print_test("Get reminders", False, f"Status: {response.status_code}, Response: {response.text}")
        return passed
    except Exception as e:
        print_test("Get reminders", False, str(e))
        return False

# ────────────────────────────────────────────────────────────────────────────
# 7. QUIZ TESTS
# ────────────────────────────────────────────────────────────────────────────
def test_create_quiz():
    print_section("CREATE QUIZ")
    global quiz_id
    try:
        headers = {"Authorization": f"Bearer {access_token}"}
        data = {
            "module_id": module_id,
            "title": "Test Quiz",
            "description": "Test quiz description"
        }
        response = requests.post(f"{BASE_URL}/quizzes", json=data, headers=headers)
        passed = response.status_code == 201
        if passed:
            quiz_data = response.json()
            quiz_id = quiz_data.get("id")
            print_test("Create quiz", True, f"Quiz ID: {quiz_id}, Title: {quiz_data.get('title')}")
        else:
            print_test("Create quiz", False, f"Status: {response.status_code}, Response: {response.text}")
        return passed
    except Exception as e:
        print_test("Create quiz", False, str(e))
        return False

def test_get_quizzes():
    print_section("GET QUIZZES")
    try:
        headers = {"Authorization": f"Bearer {access_token}"}
        response = requests.get(f"{BASE_URL}/quizzes", headers=headers)
        passed = response.status_code == 200 and isinstance(response.json(), list)
        if passed:
            quizzes = response.json()
            print_test("Get quizzes", True, f"Found {len(quizzes)} quizzes")
        else:
            print_test("Get quizzes", False, f"Status: {response.status_code}, Response: {response.text}")
        return passed
    except Exception as e:
        print_test("Get quizzes", False, str(e))
        return False

# ────────────────────────────────────────────────────────────────────────────
# 8. AI CONVERSATION TESTS
# ────────────────────────────────────────────────────────────────────────────
def test_start_ai_conversation():
    print_section("START AI CONVERSATION")
    global conversation_id
    try:
        headers = {"Authorization": f"Bearer {access_token}"}
        data = {
            "module_id": module_id,
            "message": "Hello, can you help me study?"
        }
        response = requests.post(f"{BASE_URL}/ai/conversations", json=data, headers=headers)
        passed = response.status_code == 201
        if passed:
            conversation_data = response.json()
            conversation_id = conversation_data.get("id")
            print_test("Start AI conversation", True, f"Conversation ID: {conversation_id}")
        else:
            print_test("Start AI conversation", False, f"Status: {response.status_code}, Response: {response.text}")
        return passed
    except Exception as e:
        print_test("Start AI conversation", False, str(e))
        return False

def test_get_ai_conversations():
    print_section("GET AI CONVERSATIONS")
    try:
        headers = {"Authorization": f"Bearer {access_token}"}
        response = requests.get(f"{BASE_URL}/ai/conversations", headers=headers)
        passed = response.status_code == 200 and isinstance(response.json(), list)
        if passed:
            conversations = response.json()
            print_test("Get AI conversations", True, f"Found {len(conversations)} conversations")
        else:
            print_test("Get AI conversations", False, f"Status: {response.status_code}, Response: {response.text}")
        return passed
    except Exception as e:
        print_test("Get AI conversations", False, str(e))
        return False

# ────────────────────────────────────────────────────────────────────────────
# 9. CLEANUP TEST USER
# ────────────────────────────────────────────────────────────────────────────
def test_delete_user():
    print_section("CLEANUP - DELETE TEST USER")
    try:
        headers = {"Authorization": f"Bearer {access_token}"}
        response = requests.delete(f"{BASE_URL}/users/me", headers=headers)
        passed = response.status_code == 204
        if passed:
            print_test("Delete test user", True, "Test user deleted successfully")
        else:
            print_test("Delete test user", False, f"Status: {response.status_code}, Response: {response.text}")
        return passed
    except Exception as e:
        print_test("Delete test user", False, str(e))
        return False

# ────────────────────────────────────────────────────────────────────────────
# MAIN TEST RUNNER
# ────────────────────────────────────────────────────────────────────────────
def run_all_tests():
    print("\n" + "="*60)
    print("  LEARNOVA API COMPREHENSIVE TEST SUITE")
    print("="*60)
    
    results = []
    
    # Health
    results.append(("Health Check", test_health_check()))
    
    # Auth
    results.append(("User Registration", test_user_registration()))
    results.append(("User Login", test_user_login()))
    results.append(("Get Current User", test_get_current_user()))
    results.append(("Token Refresh", test_token_refresh()))
    
    # Modules
    results.append(("Create Module", test_create_module()))
    results.append(("Get Modules", test_get_modules()))
    results.append(("Update Module", test_update_module()))
    
    # Notes
    results.append(("Create Note", test_create_note()))
    results.append(("Get Notes", test_get_notes()))
    
    # Study Sessions
    results.append(("Create Study Session", test_create_study_session()))
    results.append(("Get Study Sessions", test_get_study_sessions()))
    
    # Calendar
    results.append(("Create Calendar Event", test_create_calendar_event()))
    results.append(("Get Calendar Events", test_get_calendar_events()))
    
    # Reminders
    results.append(("Create Reminder", test_create_reminder()))
    results.append(("Get Reminders", test_get_reminders()))
    
    # Quizzes
    results.append(("Create Quiz", test_create_quiz()))
    results.append(("Get Quizzes", test_get_quizzes()))
    
    # AI
    results.append(("Start AI Conversation", test_start_ai_conversation()))
    results.append(("Get AI Conversations", test_get_ai_conversations()))
    
    # Cleanup
    results.append(("Delete Test User", test_delete_user()))
    
    # Summary
    print("\n" + "="*60)
    print("  TEST SUMMARY")
    print("="*60)
    passed_count = sum(1 for _, passed in results if passed)
    total_count = len(results)
    print(f"\nPassed: {passed_count}/{total_count}")
    print(f"Failed: {total_count - passed_count}/{total_count}")
    
    if passed_count == total_count:
        print("\n✓ ALL TESTS PASSED! 🎉")
    else:
        print("\n✗ SOME TESTS FAILED")
        print("\nFailed tests:")
        for test_name, passed in results:
            if not passed:
                print(f"  - {test_name}")
    
    print("\n" + "="*60)
    return passed_count == total_count

if __name__ == "__main__":
    run_all_tests()
