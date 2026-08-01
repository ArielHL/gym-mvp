# AGENTS.md

## Repo Shape
- This is an npm-based Expo/React Native app with Expo Router as the real entrypoint: `package.json` uses `expo-router/entry`, and `app.json` sets the router root to `src/app`.
- `App.tsx` is legacy/stale for the current app path and imports missing `@/navigation/AppNavigator`; prefer `src/app/_layout.tsx` and route files under `src/app/`.
- Route files in `src/app/` are thin wrappers around feature screens in `src/features/*`; make screen changes in feature folders, not in the route wrappers unless routing changes.
- The mobile app reads Supabase directly for auth/read models and calls the FastAPI backend for booking/cancel writes via `EXPO_PUBLIC_API_BASE_URL`.
- `functions/` is a separate Firebase Functions package with its own `package.json` and lockfile; do not assume root npm commands install or build it.

## Commands
- Install root app deps with `npm install`.
- Start Expo Go mode with `npm run start`; use `npm run start:dev-client` only for a dev client.
- Web preview is `npm run web`.
- Seed Firestore classes with `GOOGLE_APPLICATION_CREDENTIALS=<service-account-json> npm run seed`; the script reads `seed/classes.seed.json`.
- Install/build Firebase Functions from `functions/`: `npm install`, then `npm run build`, `npm run serve`, or `npm run deploy`.
- Run the optional FastAPI backend from `backend/`: create/activate a venv, `pip install -r requirements.txt`, then `uvicorn app.main:app --host 0.0.0.0 --port 8080 --reload`.

## Environment And Data
- Root Expo env keys are `EXPO_PUBLIC_SUPABASE_URL`, `EXPO_PUBLIC_SUPABASE_ANON_KEY`, and optional `EXPO_PUBLIC_API_BASE_URL` defaulting to `http://localhost:8080`.
- Backend env keys are `DATABASE_URL`, optional `DATABASE_URL_FALLBACK`, and `SUPABASE_JWT_SECRET`; backend settings load from its working-directory `.env`.
- Supabase schema is in `supabase/migrations/20260312_001_init.sql`; mobile code expects `classes_feed` and `bookings_feed` views plus `class_sessions`/`bookings` tables.
- Google OAuth redirect scheme is `gymmobilemvp://auth/callback` from `app.json` and auth service usage.

## Verification Gotchas
- There is no test script in the root package or `functions/` package.
- `npm run lint` currently fails because ESLint 9 is installed but no `eslint.config.*` exists.
- `npm run typecheck` currently fails because root `tsconfig.json` includes stale `App.tsx`, includes `functions/src` without that package's deps in root resolution, and has existing React Native typing errors.
- `npm run build` inside `functions/` currently fails on TypeScript 6 migration/deprecation settings (`rootDir` and `moduleResolution=node10`).

## Styling And Imports
- Use `@/` imports for `src/*`; aliases are configured in both `tsconfig.json` and `babel.config.js`.
- NativeWind is wired through `global.css`, `tailwind.config.js`, `nativewind/babel`, and `withNativeWind`; keep Tailwind content paths aligned with `src/**/*.{ts,tsx}`.
- The app’s visual language is a dark gym UI with cyan/purple/amber accents; preserve existing tokens and patterns unless explicitly redesigning.
