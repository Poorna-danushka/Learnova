# This file makes the models directory a Python package.
# It allows other modules to import from app.models
# Import all models to ensure SQLAlchemy relationships are established

from app.models.user import User
from app.models.module import Module
from app.models.subject import Subject
from app.models.note import Note
from app.models.study_material import StudyMaterial
from app.models.study_session import StudySession, StudyGoal
from app.models.calendar_event import CalendarEvent
from app.models.quiz import Quiz, QuizQuestion, QuizAttempt
from app.models.ai_usage import AIUsage
from app.models.ai_conversation import AIConversation, AIMessage
from app.models.ai_study_plan import AIStudyPlan
from app.models.device_token import DeviceToken
from app.models.reminder import Reminder
from app.models.notification_history import NotificationHistory
from app.models.refresh_session import RefreshSession, RefreshToken
from app.models.account_token import AccountToken

__all__ = [
    "User",
    "Module",
    "Subject",
    "Note",
    "StudyMaterial",
    "StudySession",
    "StudyGoal",
    "CalendarEvent",
    "Quiz",
    "QuizQuestion",
    "QuizAttempt",
    "AIUsage",
    "AIConversation",
    "AIMessage",
    "AIStudyPlan",
    "DeviceToken",
    "Reminder",
    "NotificationHistory",
    "RefreshSession",
    "RefreshToken",
    "AccountToken",
]

