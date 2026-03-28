# Gym Mobile MVP (Expo + Supabase + FastAPI)

Mobile-first gym app for class booking.

## Stack
- Frontend: React Native + Expo + TypeScript
- Auth + DB: Supabase (PostgreSQL + PostgREST + OAuth)
- Business logic API: Python FastAPI (`backend/`)

## Features in this repo
- Email/password auth and social login support through Supabase (Google, Facebook, Apple)
- Class schedule feed from Supabase views
- Book/cancel class via FastAPI
- Admin screen to create class templates

## Prerequisites
- Node.js 20+
- npm
- Python (3.11+)
- Supabase project

## 1) Install dependencies
From the project root:

```bash
npm install
```

## 2) Configure frontend env
Create `.env` in repo root from `.env.example`:

```env
EXPO_PUBLIC_SUPABASE_URL=
EXPO_PUBLIC_SUPABASE_ANON_KEY=
EXPO_PUBLIC_API_BASE_URL=http://localhost:8080
```

Use your Supabase project URL and anon key.

## 3) Configure backend env
Create `backend/.env` from `backend/.env.example`:

```env
PORT=8080
DATABASE_URL=postgresql://postgres:<password>@<host>:5432/postgres?sslmode=require
SUPABASE_JWT_SECRET=<your-supabase-jwt-secret>
```

Notes:
- `DATABASE_URL` should be your Supabase Postgres connection string.
- `SUPABASE_JWT_SECRET` is in Supabase project settings (JWT settings).

## 4) Apply database migration
Run SQL from:

`supabase/migrations/20260312_001_init.sql`

Recommended: open Supabase SQL Editor and run the full file once.

This migration creates:
- `profiles`, `class_templates`, `class_sessions`, `bookings`, `subscriptions`, `notification_tokens`
- RLS policies
- `classes_feed` and `bookings_feed` views

## 5) Configure Supabase Auth providers
In Supabase Dashboard:
- Enable `Email`
- Enable `Google`, `Facebook`, `Apple`

Set redirect URLs for Expo app scheme:
- `gymmobilemvp://auth/callback`

If using Expo web locally, include your local web callback as needed.

## 6) Run backend API (FastAPI)
From `backend/`:

```bash
python -m venv .venv
.venv/Scripts/activate
pip install -r requirements.txt
uvicorn app.main:app --host 0.0.0.0 --port 8080
```

API runs on `http://localhost:8080` by default.

## 7) Run mobile app
From repo root:

```bash
npm run start
```

Then choose:
- `a` for Android
- `i` for iOS
- `w` for web

## 8) Verification commands
Frontend typecheck:

```bash
npm run typecheck
```

Backend quick check:

```bash
cd backend
python -m compileall app
```

## Project structure (important parts)
- `src/` React Native app
- `src/services/supabase/client.ts` Supabase client
- `backend/` FastAPI for booking logic
- `supabase/migrations/` DB schema and RLS

## Current limitations
- Session generation from recurring templates is not yet automated by scheduler in this repo.
- Payments/subscriptions schema exists, but full Stripe flow is not fully wired end-to-end yet.
