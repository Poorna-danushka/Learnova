# Learnova

**AI-powered learning and productivity platform for university students.**

Learnova combines a FastAPI backend with a React Native (Expo) mobile app to give students a unified workspace for organising modules, taking notes, uploading study materials, planning study sessions, running AI-generated quizzes, and chatting with an AI assistant — all backed by push notifications and email reminders.

---

## Table of Contents

- [Features](#features)
- [Architecture](#architecture)
- [Tech Stack](#tech-stack)
- [Project Structure](#project-structure)
- [Getting Started](#getting-started)
  - [Prerequisites](#prerequisites)
  - [Backend Setup](#backend-setup)
  - [Mobile Setup](#mobile-setup)
- [Environment Variables](#environment-variables)
- [API Overview](#api-overview)
- [Database Models](#database-models)
- [AI Features](#ai-features)
- [Notifications & Reminders](#notifications--reminders)
- [File Storage](#file-storage)
- [Authentication](#authentication)

---

## Features

| Area | What it does |
|---|---|
| **Auth** | Register, login, email verification, forgot / reset password, JWT access + refresh tokens |
| **Modules** | Create and manage university modules with colours and descriptions |
| **Notes** | Rich notes tied to modules, full CRUD |
| **Study Materials** | Upload PDF, DOCX, PPTX files; stored locally or in AWS S3; AI can read them |
| **Study Planning** | Create study sessions (scheduled, timed) and study goals with progress tracking |
| **Calendar** | Personal calendar events with start/end times and descriptions |
| **Quizzes** | AI-generated multiple-choice quizzes from module content; attempt tracking |
| **AI Assistant** | Multi-turn chat powered by Google Gemini; per-day rate limiting |
| **AI Study Plans** | Generate a personalised study plan from your modules and goals |
| **Notifications** | Firebase Cloud Messaging push notifications; in-app notification history |
| **Reminders** | Scheduled reminders for study sessions; background scheduler via APScheduler |
| **Profile** | University, degree, graduation year, notification preferences |
| **Onboarding** | First-run walkthrough guiding new users through setup |

---

## Architecture

```
Learnova/
├── backend/      # FastAPI REST API (Python)
└── mobile/       # React Native app (Expo / TypeScript)
```

The mobile app communicates with the backend exclusively over HTTP(S). There is no direct database access from the mobile side.

```
Mobile (Expo)
    │  HTTPS / JSON
    ▼
FastAPI  ──►  PostgreSQL  (SQLAlchemy ORM + Alembic migrations)
    │
    ├──►  Google Gemini API  (AI features)
    ├──►  AWS S3             (file storage, optional)
    ├──►  Firebase Admin SDK (push notifications)
    └──►  Resend             (transactional email)
```

---

## Tech Stack

### Backend
| Layer | Technology |
|---|---|
| Framework | FastAPI 0.110+ |
| Language | Python 3.11+ |
| Database | PostgreSQL |
| ORM | SQLAlchemy 2.0 |
| Migrations | Alembic |
| Auth | JWT (PyJWT) + Argon2 password hashing (pwdlib) |
| AI | Google Gemini (`gemini-3.5-flash` by default) |
| File Storage | Local filesystem or AWS S3 (boto3) |
| Push Notifications | Firebase Admin SDK |
| Email | Resend API |
| Scheduler | APScheduler 3.x |
| Validation | Pydantic v2 |

### Mobile
| Layer | Technology |
|---|---|
| Framework | React Native 0.86 + Expo SDK 57 |
| Language | TypeScript 6 |
| Router | Expo Router (file-based) |
| HTTP Client | Axios |
| Forms | React Hook Form + Zod |
| Notifications | expo-notifications |
| Secure Storage | expo-secure-store |
| File Picker | expo-document-picker |
| Animations | React Native Reanimated 4 + Animated API |
| State | React Context (AuthContext) |
| Styling | StyleSheet (custom design system via `src/constants/theme.ts`) |

---

## Project Structure

```
Learnova/
├── backend/
│   ├── app/
│   │   ├── core/           # Config, security, dependencies, sanitisation
│   │   ├── database/       # SQLAlchemy engine & session factory
│   │   ├── models/         # ORM models (one file per entity)
│   │   ├── routers/        # FastAPI route handlers (one file per feature)
│   │   ├── schemas/        # Pydantic request/response schemas
│   │   └── services/       # Business logic (AI, email, storage, notifications …)
│   ├── alembic/            # Database migrations
│   ├── tests/              # Pytest test suite
│   ├── uploads/            # Local file storage (dev only)
│   ├── main.py             # App entry point, router registration, CORS, lifespan
│   ├── requirements.txt
│   └── .env.example
│
└── mobile/
    ├── src/
    │   ├── app/            # Expo Router screens (file = route)
    │   │   ├── (tabs)/     # Bottom-tab screens (Home dashboard)
    │   │   ├── modules/    # Module detail screens
    │   │   ├── notes/      # Note create / edit screens
    │   │   └── quiz/       # Quiz attempt screen
    │   ├── components/     # Shared UI components
    │   ├── constants/      # Theme tokens, route constants
    │   ├── context/        # AuthContext (token management)
    │   ├── services/
    │   │   ├── api/        # Per-feature Axios API clients
    │   │   └── notifications/  # Expo notification service
    │   └── types/          # Shared TypeScript types
    ├── assets/             # Icons, splash, adaptive icons
    ├── app.json            # Expo config
    └── package.json
```

---

## Getting Started

### Prerequisites

- **Python 3.11+**
- **Node.js 18+** and **npm**
- **PostgreSQL** (running locally or remote)
- **Expo Go** app on your device, or Android/iOS emulator

---

### Backend Setup

```bash
# 1. Navigate to the backend directory
cd backend

# 2. Create and activate a virtual environment
python -m venv .venv
# Windows
.venv\Scripts\activate
# macOS/Linux
source .venv/bin/activate

# 3. Install dependencies
pip install -r requirements.txt

# 4. Copy the example env file and fill in your values
copy .env.example .env   # Windows
# cp .env.example .env   # macOS/Linux

# 5. Run database migrations
alembic upgrade head

# 6. Start the development server
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

The API will be available at `http://localhost:8000`.  
Interactive docs: `http://localhost:8000/docs`  
Health check: `http://localhost:8000/health`

---

### Mobile Setup

```bash
# 1. Navigate to the mobile directory
cd mobile

# 2. Install dependencies
npm install

# 3. Set the API URL (points to your running backend)
#    Create a .env file in the mobile directory:
echo EXPO_PUBLIC_API_URL=http://<YOUR_LOCAL_IP>:8000 > .env
#    Use your machine's local network IP (not 127.0.0.1) when testing on a physical device.

# 4. Start the Expo development server
npx expo start

# Then press:
#   a  → open Android emulator
#   i  → open iOS simulator
#   w  → open in browser
#   Scan QR code with Expo Go on your phone
```

---

## Environment Variables

All backend configuration lives in `backend/.env`. Copy `backend/.env.example` and fill in the values.

| Variable | Required | Description |
|---|---|---|
| `DATABASE_URL` | ✅ | PostgreSQL connection string |
| `JWT_SECRET` | ✅ | Secret key for signing JWTs |
| `JWT_ALGORITHM` | — | Default `HS256` |
| `JWT_ACCESS_TOKEN_EXPIRE_MINUTES` | — | Default `10080` (7 days) |
| `JWT_REFRESH_TOKEN_EXPIRE_DAYS` | — | Default `30` |
| `GEMINI_API_KEY` | AI features | Google Gemini API key |
| `GEMINI_MODEL` | — | Default `gemini-3.5-flash` |
| `AI_DAILY_REQUEST_LIMIT` | — | Per-user daily AI request cap (default `20`) |
| `AI_MAX_INPUT_CHARS` | — | Max chars sent to AI (default `120000`) |
| `STORAGE_BACKEND` | — | `local` (default) or `s3` |
| `AWS_ACCESS_KEY_ID` | S3 only | AWS credentials |
| `AWS_SECRET_ACCESS_KEY` | S3 only | AWS credentials |
| `AWS_REGION` | S3 only | Default `us-east-1` |
| `AWS_S3_BUCKET` | S3 only | Target S3 bucket name |
| `FIREBASE_PROJECT_ID` | Push notifications | Firebase project |
| `FIREBASE_CLIENT_EMAIL` | Push notifications | Firebase service account |
| `FIREBASE_PRIVATE_KEY` | Push notifications | Firebase service account |
| `REMINDER_SCHEDULER_ENABLED` | — | Enable background reminder scheduler (`false` by default) |
| `REMINDER_SCHEDULER_INTERVAL_SECONDS` | — | Scheduler polling interval (default `30`) |
| `RESEND_API_KEY` | Email | Resend transactional email key |
| `RESEND_FROM_EMAIL` | Email | Sender address |
| `FRONTEND_URL` | — | Base URL for email links (default `http://localhost:8081`) |
| `CORS_ORIGINS` | Production ✅ | Comma-separated allowed origins |
| `APP_ENV` | — | `development` or `production` |

**Mobile:** set `EXPO_PUBLIC_API_URL` in `mobile/.env` to your backend URL.

---

## API Overview

All routes are prefixed by their resource name. JWT Bearer authentication is required on all protected endpoints.

| Router | Prefix | Key Endpoints |
|---|---|---|
| **Auth** | `/auth` | `POST /register`, `POST /login`, `POST /refresh`, `POST /logout`, `POST /verify-email`, `POST /forgot-password`, `POST /reset-password` |
| **Users** | `/users` | `GET /me`, `PATCH /me`, `DELETE /me` |
| **Modules** | `/modules` | Full CRUD for university modules |
| **Notes** | `/notes` | Full CRUD; notes belong to a module |
| **Study Materials** | `/study-materials` | Upload (PDF/DOCX/PPTX), list, delete; file parsing for AI |
| **Study Planning** | `/study-planning` | Study sessions and study goals CRUD |
| **Calendar** | `/calendar` | Calendar events CRUD |
| **Quizzes** | `/quizzes` | AI quiz generation, list, attempt submission |
| **AI Conversations** | `/ai` | Multi-turn chat, AI study plan generation |
| **Notifications** | `/notifications` | Register device token, send test notification |
| **Reminders** | `/reminders` | Create, list, update, delete study reminders |
| **Notification History** | `/notification-history` | List and mark notifications as read |

Full interactive documentation is available at `/docs` (Swagger UI) when the server is running.

---

## Database Models

| Model | Table | Purpose |
|---|---|---|
| `User` | `users` | Core auth and profile; university, degree, graduation year |
| `Module` | `modules` | University module (subject) with colour coding |
| `Note` | `notes` | Markdown/text notes linked to a module |
| `StudyMaterial` | `study_materials` | Uploaded files (PDF, DOCX, PPTX) with parsed text |
| `StudySession` | `study_sessions` | Scheduled study blocks with duration and completion flag |
| `StudyGoal` | `study_goals` | Learning goals with target dates |
| `CalendarEvent` | `calendar_events` | Personal calendar events |
| `Quiz` | `quizzes` | AI-generated quizzes; stores questions as JSON |
| `AIConversation` | `ai_conversations` | Chat thread per user; messages stored as JSON |
| `AIStudyPlan` | `ai_study_plans` | AI-generated study plan document |
| `AIUsage` | `ai_usage` | Daily per-user AI request tracking for rate limiting |
| `Reminder` | `reminders` | Study reminders linked to sessions |
| `DeviceToken` | `device_tokens` | Firebase FCM tokens per device |
| `NotificationHistory` | `notification_history` | Record of all sent push notifications |
| `RefreshSession` | `refresh_sessions` | Active JWT refresh token sessions |
| `AccountToken` | `account_tokens` | Email verification and password-reset tokens |

---

## AI Features

Learnova uses **Google Gemini** (`gemini-3.5-flash` by default) for all AI functionality.

- **AI Chat** — multi-turn conversation assistant accessible from any screen via the `/ai` route. Conversation history is persisted per user.
- **Quiz Generation** — generates multiple-choice quizzes from the content of a selected module's notes and materials.
- **Study Plan Generation** — creates a personalised study schedule based on the user's modules, goals, and available time.
- **Material Q&A** — users can ask questions directly about an uploaded PDF, DOCX, or PPTX file; the backend parses and passes the text to Gemini.

**Rate limiting:** each user has a configurable daily request cap (`AI_DAILY_REQUEST_LIMIT`, default 20). Usage is tracked in the `ai_usage` table and surfaced in the mobile app as a rate-limit banner.

---

## Notifications & Reminders

- **Push notifications** are delivered via **Firebase Cloud Messaging (FCM)**. The mobile app registers a device token on first authenticated launch; the backend stores it in `device_tokens`.
- **Reminders** can be attached to study sessions. The `APScheduler`-powered background job (`reminder_scheduler.py`) polls the database at a configurable interval and dispatches FCM notifications when a reminder is due.
- **In-app notification history** stores every sent notification so users can review them from the `/notifications` screen.
- Notification preferences (push, reminders) are configurable per user in the profile screen.

---

## File Storage

Study materials (PDF, DOCX, PPTX) are handled by `app/services/storage.py`.

- **Local (default):** files are saved to `backend/uploads/`. Set `STORAGE_BACKEND=local`.
- **AWS S3:** set `STORAGE_BACKEND=s3` and provide the AWS credentials and bucket name in `.env`. The bucket should remain private; in production prefer IAM instance roles and leave the key fields empty.

Uploaded files are parsed on upload (`pypdf`, `python-docx`, `python-pptx`) so their text content is immediately available to AI endpoints without re-reading the file on every request.

---

## Authentication

Learnova uses a **dual-token** JWT strategy:

1. **Access token** — short-lived (default 7 days, configurable). Sent in the `Authorization: Bearer <token>` header.
2. **Refresh token** — long-lived (default 30 days). Stored server-side in `refresh_sessions`; used to issue new access tokens at `POST /auth/refresh`.

Passwords are hashed with **Argon2** via `pwdlib`.

Email verification is mandatory. On registration, a time-limited token is emailed via Resend; the mobile app handles the deep link at `/verify-email`. Password reset follows the same token-based flow at `/reset-password`.

Security headers (`X-Content-Type-Options`, `X-Frame-Options`, `Referrer-Policy`) are added to every response via middleware.

---

## Running Tests

```bash
cd backend
pytest
```

The test suite uses `httpx` with the FastAPI `TestClient` and a SQLite in-memory database (or `test.db` for integration tests).

---

## Licence

This project is private. All rights reserved.
