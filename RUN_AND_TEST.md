# Run & Test Guide — CaliFit

---

## Prerequisites

| Tool | Version | Purpose |
|---|---|---|
| Node.js | 20+ | App + tooling |
| npm | bundled with Node | Package manager |
| Python | 3.11+ | FastAPI backend (optional) |
| Expo Go | latest | Run on physical device |
| Android Emulator or iOS Simulator | any | Run on emulator (optional) |

---

## 1. Install dependencies

```bash
npm install
```

---

## 2. Environment setup

Create a `.env` file in the project root:

```env
EXPO_PUBLIC_SUPABASE_URL=https://<your-project>.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=<your-anon-key>
EXPO_PUBLIC_API_BASE_URL=http://localhost:8080
```

Get your URL and anon key from:
**Supabase Dashboard → Project Settings → API → Project URL / anon public key**

---

## 3. Apply database schema

Open the **Supabase SQL Editor** and run the full file:

```
supabase/migrations/20260312_001_init.sql
```

Tables created: `profiles`, `class_templates`, `class_sessions`, `bookings`, `subscriptions`, `notification_tokens`
Views created: `classes_feed`, `bookings_feed`
RLS policies are applied automatically.

---

## 4. Configure Supabase Auth

In **Supabase Dashboard → Authentication → Providers**:
- Enable **Email**
- Enable **Google**, **Facebook**, or **Apple** if needed

Set the redirect URL for Expo Go:
```
gymmobilemvp://auth/callback
```

---

## 5. Start the app

```bash
npm run start
```

Runs Expo in **Expo Go** mode (no native build needed).

| Key | Action |
|---|---|
| `a` | Open on Android emulator / connected device |
| `i` | Open on iOS simulator (macOS only) |
| `w` | Open in web browser |
| Scan QR | Open in Expo Go on your phone |

---

## 6. Optional — Run the FastAPI backend

The booking write API runs separately. It is optional for read-only class browsing.

```bash
cd backend
python -m venv .venv
.venv\Scripts\activate        # Windows
# source .venv/bin/activate   # macOS / Linux
pip install -r requirements.txt
```

Create `backend/.env`:

```env
PORT=8080
DATABASE_URL=postgresql://postgres:<password>@<host>:5432/postgres?sslmode=require
SUPABASE_JWT_SECRET=<your-jwt-secret>
```

Start:

```bash
uvicorn app.main:app --host 0.0.0.0 --port 8080 --reload
```

Health check → [http://localhost:8080/health](http://localhost:8080/health)

---

## 7. Optional — Seed class data

If your Supabase database has no class sessions yet, run the seed script:

```bash
node seed/import-classes.mjs
```

> Requires `EXPO_PUBLIC_SUPABASE_URL` and `EXPO_PUBLIC_SUPABASE_ANON_KEY` in `.env`.

---

## 8. Quality checks

```bash
# TypeScript type-check
npm run typecheck

# Lint
npm run lint
```

> Note: `functions/src/index.ts` has pre-existing Firebase type errors (missing devDependencies in that sub-package). These do not affect the Expo app — only `src/` matters for the mobile build.

---

## App Navigation Overview

```
AppNavigator (Stack)
├── Landing              ← unauthenticated users
├── Auth                 ← login
├── Register             ← sign up
└── Main (Bottom Tabs)   ← authenticated users
    ├── 🏠 Home          ← carousel + drawer
    ├── 📋 Classes       ← search + filter
    ├── 📅 Book          ← 3-step booking
    └── 👤 Profile       ← account + stats
        └── BookClass    ← modal (also from class cards)
```

---

## Troubleshooting

| Problem | Fix |
|---|---|
| Expo fails to start | `npx expo start -c` (clears Metro cache) |
| White screen / JS error | Check `.env` values are correct |
| "Network request failed" | Make sure Supabase URL has no trailing slash |
| Classes list empty | Run the seed script or add rows to `class_sessions` in Supabase |
| Image not loading | Network required; Unsplash images are fetched at runtime |
| TypeScript errors in `functions/` | Pre-existing; unrelated to mobile app — safe to ignore |
| Android emulator blank | Run `npm run android` first to install the dev client, then `npm run start` |
