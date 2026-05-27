# CaliFit — Gym Mobile App

A modern dark-theme mobile gym app for browsing and booking calisthenics classes.
Built with **React Native + Expo**, **Supabase** (auth & database), and **FastAPI** (booking logic).

---

## Tech Stack

| Layer | Technology |
|---|---|
| Mobile | React Native 0.83 + Expo ~55 + TypeScript ~5.9 |
| State / Data | TanStack React Query v5 |
| Navigation | React Navigation v6 (native-stack + bottom-tabs) |
| Auth + Database | Supabase (PostgreSQL + RLS) |
| Business logic API | Python FastAPI (`backend/`) |
| Calendar picker | react-native-calendars |
| Forms | react-hook-form + zod |

---

## App Screens

### Bottom Tab Navigation

| Tab | Screen | Description |
|---|---|---|
| 🏠 Home | `HomeScreen` | Hero carousel with calisthenics images, animated hamburger drawer, stats row, today's classes |
| 📋 Classes | `ClassesScreen` | Full class list with search, date navigation, and difficulty filter chips |
| 📅 Book | `BookClassScreen` | 3-step booking flow: pick date → choose class → select location → confirm |
| 👤 Profile | `ProfileScreen` | Avatar, stats, membership card, account menu, sign out |

### Hamburger Drawer (Home screen)
- **Book Classes** → Book tab
- **Pay a Subscription** → Book tab
- **Find a Class for You** → Classes tab

### Stack Screens (modal / detail)
- `ClassDetails` — full class info
- `BookClass` — booking modal (also accessible from class cards)
- `Auth` / `Register` — auth flow for unauthenticated users

---

## Design System

| Token | Value |
|---|---|
| Background | `#0A0A0A` |
| Card surface | `#141414` / `#1C1C1C` |
| Accent cyan | `#22D3EE` |
| Accent purple | `#A855F7` |
| Accent amber | `#F59E0B` |
| Danger | `#EF4444` |
| Text primary | `#FFFFFF` |
| Text muted | `#555555` |

---

## Prerequisites

- **Node.js 20+** and **npm**
- **Python 3.11+** (for the optional FastAPI backend)
- **Supabase project** — [supabase.com](https://supabase.com) (free tier works)
- **Expo Go** app on your phone (iOS or Android) — or an emulator

---

## Quick Start

### 1. Install dependencies

```bash
npm install
```

### 2. Configure environment

Create `.env` in the project root:

```env
EXPO_PUBLIC_SUPABASE_URL=https://<your-project>.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=<your-anon-key>
EXPO_PUBLIC_API_BASE_URL=http://localhost:8080
```

Get your URL and anon key from **Supabase Dashboard → Project Settings → API**.

### 3. Apply the database migration

In the **Supabase SQL Editor**, run the full contents of:

```
supabase/migrations/20260312_001_init.sql
```

This creates: `profiles`, `class_templates`, `class_sessions`, `bookings`, `subscriptions`, `notification_tokens`, RLS policies, and the `classes_feed` / `bookings_feed` views.

### 4. Run the app

```bash
npm run start
```

Expo starts in **Expo Go** mode. Scan the QR code with the Expo Go app on your device.

| Key | Target |
|---|---|
| `a` | Android emulator or device |
| `i` | iOS simulator (macOS only) |
| `w` | Web browser |

---

## Optional: Run the FastAPI backend

The backend handles booking write logic with JWT validation.

```bash
cd backend
python -m venv .venv
.venv/Scripts/activate        # Windows
# source .venv/bin/activate   # macOS / Linux
pip install -r requirements.txt
```

Create `backend/.env`:

```env
PORT=8080
DATABASE_URL=postgresql://postgres:<password>@<host>:5432/postgres?sslmode=require
SUPABASE_JWT_SECRET=<your-supabase-jwt-secret>
```

Start the server:

```bash
uvicorn app.main:app --host 0.0.0.0 --port 8080 --reload
```

Health check: [http://localhost:8080/health](http://localhost:8080/health)

---

## Project Structure

```
src/
  features/
    home/         HomeScreen — carousel, drawer
    classes/      ClassesScreen, ClassDetailsScreen, hooks, services
    bookings/     BookClassScreen, MyBookingsScreen, hooks, services
    profile/      ProfileScreen
    auth/         LoginScreen, RegisterScreen, hooks, services
    core/         LandingScreen
  navigation/     AppNavigator.tsx (stack + tabs)
  services/
    supabase/     client.ts
  types/          models.ts, navigation.ts
  utils/          date.ts
  components/     shared UI components
backend/          FastAPI app
supabase/
  migrations/     20260312_001_init.sql
```

---

## Quality Checks

```bash
# TypeScript type-check (src/ only — functions/ has pre-existing firebase dep errors)
npm run typecheck

# Lint
npm run lint
```

---

## Known Limitations

- Class session scheduling from recurring templates is not yet automated by a scheduler.
- Subscription / payment Stripe flow is schema-ready but not fully wired end-to-end.
- Unsplash images are loaded over the network; offline mode shows empty placeholders.
