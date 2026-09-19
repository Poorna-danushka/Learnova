# Learnova Mobile

React Native (Expo) mobile app for the Learnova platform — an AI-powered learning and productivity companion for university students.

> For full project documentation including the backend, see the [root README](../README.md).

---

## Table of Contents

- [Tech Stack](#tech-stack)
- [Prerequisites](#prerequisites)
- [Setup](#setup)
- [Running the App](#running-the-app)
- [Environment Variables](#environment-variables)
- [Project Structure](#project-structure)
- [Screens & Navigation](#screens--navigation)
- [State & Auth](#state--auth)
- [API Services](#api-services)
- [Notifications](#notifications)
- [Design System](#design-system)
- [Building for Production](#building-for-production)

---

## Tech Stack

| Concern | Library / Version |
|---|---|
| Framework | React Native 0.86 + Expo SDK 57 |
| Language | TypeScript 6 |
| Router | Expo Router 57 (file-based routing) |
| HTTP | Axios 1.x |
| Forms | React Hook Form 7 + Zod 4 |
| Animations | React Native Reanimated 4 + React Native Animated API |
| Notifications | expo-notifications |
| Secure storage | expo-secure-store |
| File picker | expo-document-picker |
| Date/time picker | @react-native-community/datetimepicker |
| SVG | react-native-svg |
| Safe area | react-native-safe-area-context |

---

## Prerequisites

- **Node.js 18+** and **npm**
- **Expo Go** installed on your physical device, **or** an Android emulator / iOS simulator
- The **Learnova backend** running and reachable on your local network (see [backend setup](../README.md#backend-setup))

---

## Setup

```bash
# From the repo root
cd mobile

# Install dependencies
npm install
```

Create a `.env` file in the `mobile/` directory:

```env
EXPO_PUBLIC_API_URL=http://<YOUR_MACHINE_IP>:8000
```

> Use your machine's **local network IP address** (e.g. `192.168.1.x`), not `127.0.0.1`, when testing on a physical device. `127.0.0.1` works for emulators/simulators and web only.

---

## Running the App

```bash
# Start the Expo dev server
npx expo start

# Then choose a target:
#   Press  a  → Android emulator
#   Press  i  → iOS simulator
#   Press  w  → Web browser
#   Scan the QR code with Expo Go on your phone
```

Other shortcuts:

```bash
npm run android   # Open directly in Android emulator
npm run ios       # Open directly in iOS simulator
npm run web       # Open in browser
npm run lint      # Run ESLint
```

---

## Environment Variables

| Variable | Required | Description |
|---|---|---|
| `EXPO_PUBLIC_API_URL` | ✅ | Base URL of the Learnova FastAPI backend |

Expo exposes any `EXPO_PUBLIC_*` variable to the app at build time. All other secrets (Firebase, AWS, etc.) live on the **backend** — the mobile app never holds them directly.

---

## Project Structure

```
mobile/
├── src/
│   ├── app/                    # Expo Router screens (filename = route)
│   │   ├── (tabs)/
│   │   │   ├── index.tsx       # Home dashboard (bottom tab)
│   │   │   └── _layout.tsx     # Tab bar layout
│   │   ├── modules/
│   │   │   └── [id].tsx        # Module detail screen
│   │   ├── notes/
│   │   │   ├── new.tsx         # New note screen
│   │   │   └── [id].tsx        # Edit note screen
│   │   ├── quiz/
│   │   │   └── [id].tsx        # Quiz attempt screen
│   │   ├── _layout.tsx         # Root layout (AuthProvider, splash, navigation)
│   │   ├── welcome.tsx         # First-launch welcome
│   │   ├── onboarding.tsx      # Onboarding walkthrough
│   │   ├── auth.tsx            # Auth entry (login / register selector)
│   │   ├── login.tsx
│   │   ├── register.tsx
│   │   ├── forgot-password.tsx
│   │   ├── reset-password.tsx
│   │   ├── verify-email.tsx
│   │   ├── profile.tsx
│   │   ├── modules.tsx         # Module list / management
│   │   ├── notes.tsx           # Notes list
│   │   ├── materials.tsx       # Study materials (upload + AI Q&A)
│   │   ├── planning.tsx        # Study sessions & goals
│   │   ├── calendar.tsx        # Calendar events
│   │   ├── quizzes.tsx         # Quiz list & AI quiz generation
│   │   ├── ai.tsx              # AI chat assistant
│   │   └── notifications.tsx   # Notification history
│   │
│   ├── components/             # Shared UI components
│   │   ├── ui.tsx              # Design-system primitives (Button, Avatar, ProgressBar, BottomNav, …)
│   │   ├── AIAnswerCard.tsx
│   │   ├── AIPlanCard.tsx
│   │   ├── AIQuizPreview.tsx
│   │   ├── AIRateLimitBanner.tsx
│   │   ├── AIResponseRenderer.tsx
│   │   ├── AISummaryCard.tsx
│   │   ├── DeleteConfirmModal.tsx
│   │   ├── LearnovaIcon.tsx
│   │   ├── ModuleSelectorModal.tsx
│   │   └── StudyPlanContent.tsx
│   │
│   ├── constants/
│   │   ├── theme.ts            # Design tokens (colours, spacing, typography, shadows, radii)
│   │   └── routes.ts           # Typed route helpers
│   │
│   ├── context/
│   │   └── AuthContext.tsx     # Global auth state (tokens, user, signIn, signOut)
│   │
│   ├── services/
│   │   ├── authStorage.ts      # Secure token persistence (expo-secure-store)
│   │   ├── api/
│   │   │   ├── apiClient.ts    # Axios instance with auth interceptor & token refresh
│   │   │   ├── userApi.ts
│   │   │   ├── moduleApi.ts
│   │   │   ├── noteApi.ts
│   │   │   ├── studyMaterialApi.ts
│   │   │   ├── planningApi.ts
│   │   │   ├── calendarApi.ts
│   │   │   ├── quizApi.ts
│   │   │   ├── aiApi.ts
│   │   │   ├── reminderApi.ts
│   │   │   ├── notificationApi.ts
│   │   │   └── notificationHistoryApi.ts
│   │   └── notifications/
│   │       └── notificationService.ts  # Device registration & FCM handler
│   │
│   └── types/                  # Shared TypeScript type definitions
│
├── assets/
│   └── images/                 # App icon, splash, adaptive icon assets
├── app.json                    # Expo configuration
├── tsconfig.json
├── eslint.config.js
└── package.json
```

---

## Screens & Navigation

Navigation is fully file-based via **Expo Router**. The root layout (`src/app/_layout.tsx`) wraps everything in `AuthProvider` and redirects to the appropriate entry point on auth-state changes.

### Entry Flow
| Screen | Route | Description |
|---|---|---|
| Welcome | `/welcome` | Shown on first launch only |
| Onboarding | `/onboarding` | Feature walkthrough slides |
| Auth entry | `/auth` | Login / register chooser |
| Login | `/login` | Email + password login |
| Register | `/register` | Account creation |
| Forgot password | `/forgot-password` | Request password reset email |
| Reset password | `/reset-password` | Apply new password via token |
| Verify email | `/verify-email` | Email verification deep link handler |

### Main App
| Screen | Route | Description |
|---|---|---|
| Home dashboard | `/(tabs)` | Today's momentum, quick actions, modules strip, AI hub |
| Profile | `/profile` | Edit name, university, degree, year; notification prefs |
| Modules | `/modules` | List, create, edit, delete modules |
| Module detail | `/modules/[id]` | Notes and materials scoped to one module |
| Notes | `/notes` | All notes across modules |
| New note | `/notes/new` | Create a note (module selector included) |
| Edit note | `/notes/[id]` | Edit existing note |
| Study materials | `/materials` | Upload PDF/DOCX/PPTX; AI Q&A on any file |
| Study planning | `/planning` | Study sessions and goals management |
| Calendar | `/calendar` | Personal event calendar |
| Quizzes | `/quizzes` | AI quiz generation and past quizzes |
| Quiz attempt | `/quiz/[id]` | Take a quiz; results shown on completion |
| AI assistant | `/ai` | Multi-turn Gemini chat; AI study plan generation |
| Notifications | `/notifications` | Push notification history; mark as read |

---

## State & Auth

Authentication state lives in **`AuthContext`** (`src/context/AuthContext.tsx`).

- Tokens are persisted with **`expo-secure-store`** on native and `localStorage` on web via `authStorage.ts`.
- The **Axios interceptor** in `apiClient.ts` automatically attaches the access token to every request and calls `POST /auth/refresh` transparently when a 401 is received, then retries the original request.
- On logout (manual or after a failed refresh) `signOut()` clears stored tokens and redirects to `/auth`.

Auth status has three states: `loading` → `authenticated` | `unauthenticated`.

---

## API Services

Each feature has a dedicated API module under `src/services/api/`. They all use the shared `apiClient` Axios instance, so auth headers and refresh logic are handled automatically.

| File | Covers |
|---|---|
| `userApi.ts` | Current user profile, update, delete |
| `moduleApi.ts` | Module CRUD |
| `noteApi.ts` | Note CRUD |
| `studyMaterialApi.ts` | Upload, list, delete materials; AI Q&A on a file |
| `planningApi.ts` | Study sessions and study goals |
| `calendarApi.ts` | Calendar events |
| `quizApi.ts` | Generate quiz, list quizzes, submit attempt |
| `aiApi.ts` | AI chat messages, fetch conversation, generate study plan |
| `reminderApi.ts` | Reminder CRUD |
| `notificationApi.ts` | Register device token, send test notification |
| `notificationHistoryApi.ts` | List history, mark read |

---

## Notifications

1. On first authenticated launch, `registerCurrentDevice()` requests permission and sends the Expo push token to `POST /notifications/device-token`.
2. `configureNotificationHandling()` sets up foreground and tap handlers; tapping a study reminder navigates to `/planning`, others go to `/(tabs)`.
3. Background/killed-state notifications are delivered natively via Firebase Cloud Messaging; no extra configuration is required in the app beyond `google-services.json` (Android) already included in the repo.

---

## Design System

All design tokens are centralised in `src/constants/theme.ts`:

- **`Colors`** — brand teal (`#0EA5A0`), semantic colours (success, warning, error), surface/border tokens for light mode.
- **`Typography`** — font size scale (`xs` → `5xl`), weight tokens, letter-spacing.
- **`Spacing`** — 4 px base unit scale (`xs` → `2xl`).
- **`Radius`** — corner radius tokens (`sm` → `full`).
- **`Shadow`** — elevation presets (`xs`, `sm`, `glow`).

Shared primitives (`Button`, `Avatar`, `ProgressBar`, `BottomNav`, `SkeletonCard`, `SkeletonLine`, …) live in `src/components/ui.tsx`.

---

## Building for Production

Learnova uses **Expo** managed workflow. Build with EAS Build:

```bash
# Install EAS CLI (once)
npm install -g eas-cli

# Log in to your Expo account
eas login

# Build for Android
eas build --platform android

# Build for iOS
eas build --platform ios

# Export a static web build
npm run build:web
```

Make sure `EXPO_PUBLIC_API_URL` is set to your production backend URL before building.
