## Gym App Flows (User Creation, Booking, Class Creation)

This document explains how the main business flows work across the mobile app, FastAPI backend, and Supabase database.

## Architecture at a glance

- Frontend (Expo/React Native) uses:
  - `expo-router` for routes
  - `@tanstack/react-query` for server-state caching
  - Supabase Auth for login/session
- Backend (FastAPI) handles protected write operations and admin operations.
- Database (Supabase Postgres) stores profiles, class templates/sessions, bookings, locations, and views used by the app.

### Key files

- App shell + QueryClient: `src/app/_layout.tsx`
- Auth state sync: `src/features/auth/hooks/useAuthState.tsx`
- API client with bearer token: `src/services/api/client.ts`
- FastAPI endpoints: `backend/app/main.py`
- Supabase schema + views: `supabase/migrations/20260312_001_init.sql`
- Profile auto-create trigger: `supabase/migrations/20260804_001_create_profile_on_auth_user_signup.sql`
- Locations + booking/location schema updates:
  - `supabase/migrations/20260804_001_locations.sql`
  - `supabase/migrations/20260804_002_booking_locations.sql`
  - `supabase/migrations/20260808_001_class_template_location_fk.sql`

## 1) User creation flow

### 1.1 Client registration

1. User opens register route (`src/app/(public)/register.tsx`) which renders `CreateAccountScreen`.
2. `CreateAccountScreen` calls `authService.register(...)` in `src/features/auth/services/authService.ts`.
3. `authService.register` uses `supabase.auth.signUp(...)` with `full_name` in `user_metadata`.
4. If Supabase returns a session immediately (email confirmation disabled), app calls `createUserProfileIfMissing(...)`.

### 1.2 Profile creation (two safety layers)

There are two mechanisms creating `profiles` rows:

- DB trigger (primary automatic path)
  - `handle_new_auth_user_profile()` trigger on `auth.users` insert
  - (`supabase/migrations/20260804_001_create_profile_on_auth_user_signup.sql`)

- Backend ensure endpoint (application fallback/idempotent path)
  - Mobile calls `POST /profiles/me/ensure` through `createUserProfileIfMissing` in `src/services/userService.ts`, endpoint implemented in `backend/app/main.py`.

Both are idempotent (`on conflict`) so duplicates are avoided.

### 1.3 Session/auth state hydration

1. `AuthProvider` (`src/features/auth/hooks/useAuthState.tsx`) runs on app start.
2. It gets current session from Supabase.
3. If logged in:
   - Ensures profile exists (`/profiles/me/ensure`)
   - Fetches profile from `/me`
   - Stores `role` (`admin` or `member`) and `displayName`
4. Route guards in `src/app/_layout.tsx` redirect users from protected/admin routes when unauthorized.

## 2) Booking classes flow

### 2.1 Browse classes (cached)

- Classes list uses `useClasses` (`src/features/classes/hooks/useClasses.ts`) backed by React Query key `['classes', dateOrAll]`.
- Data comes from `GET /classes` (`backend/app/main.py`), which reads `classes_feed` view.
- `classes_feed` only returns active/scheduled/valid sessions with computed `available_spots`.

### 2.2 Start booking in UI

- Booking screen: `src/features/bookings/screens/BookClassScreen.tsx`
- User selects:
  1. date
  2. class session
  3. location (`GET /locations/active`)
- On confirm, app calls `useBookClass` mutation -> `bookClass(...)` -> `POST /bookings`.

### 2.3 API auth and request

- `apiPost` in `src/services/api/client.ts` automatically attaches:
  - `Authorization: Bearer <supabase_access_token>`
- Backend `get_user_id` in `backend/app/main.py`:
  1. Reads bearer token
  2. Calls Supabase `/auth/v1/user` to validate token
  3. Extracts trusted `user_id` from Supabase response

### 2.4 Backend booking transaction logic

Endpoint: `POST /bookings` in `backend/app/main.py`

Inside one DB transaction:

1. Validates `location_id` exists and is active.
2. Locks target session row (`FOR UPDATE`) and verifies:
   - session exists
   - session status is `scheduled`
   - class template is active
   - template validity window is currently valid
3. Counts confirmed bookings for that session.
4. If full -> returns conflict (`class is full`).
5. Inserts booking or re-confirms existing one:
   - `on conflict (user_id, session_id) do update ... status='confirmed'`

### 2.5 Cache invalidation after booking/cancel

`useBookClass` and `useCancelBooking` in `src/features/bookings/hooks/useBookings.ts` invalidate:

- `queryKeys.bookings` (`['bookings']`)
- `queryKeys.allBookings` (`['bookings', 'all']`)
- `queryKeys.classes` (`['classes']` prefix)

This forces refetch so UI reflects new spots/booked state.

### 2.6 Cancel booking flow

- UI calls `POST /bookings/cancel`.
- Backend checks:
  - booking exists and belongs to user
  - cancellation is at least 2 hours before start
- If valid, sets status to `cancelled` and `cancelled_at=now()`.

## 3) Class creation flow (admin)

### 3.1 Admin access control (frontend + backend)

- Frontend hides/blocks admin screens unless role is `admin`:
  - `useAuthState` + guards in `src/app/_layout.tsx`
- Backend enforces true authorization with `require_admin_user`:
  - reads role from `profiles`
  - rejects non-admin (`403`)

### 3.2 Admin class template UI

Screen: `src/features/admin/screens/AdminClassesScreen.tsx`

- Uses `react-hook-form` + `zod` validation.
- Loads:
  - templates: `GET /admin/classes`
  - weeks-ahead setting: `GET /admin/settings/weeks-ahead`
  - locations: `GET /admin/locations`
- Create action -> `createClassTemplate(...)` -> `POST /admin/classes`
- Update action -> `updateClassTemplate(...)` -> `PATCH /admin/classes/{id}`
- Active toggle -> `PATCH /admin/classes/{id}/active`

### 3.3 Backend class creation logic

Endpoint: `POST /admin/classes` in `backend/app/main.py`

1. Validates location exists.
2. Inserts into `class_templates` with `location_id`, schedule fields, validity window, capacity, etc.
3. Generates future class sessions (`class_sessions`) for N weeks (`weeks_ahead`, normalized 1..12).
4. Updates capacity on future sessions for consistency.
5. Returns created template with `location_name`.

### 3.4 Why templates + sessions

- `class_templates` represent recurring definitions (for example, every Monday 18:00).
- `class_sessions` are concrete occurrences users actually book.
- This allows:
  - controlled future generation
  - per-session capacity and booking counts
  - soft deactivation without losing history

## 4) Data model pieces involved

- `profiles`: app users + role
- `locations`: admin-managed booking locations
- `class_templates`: recurring class definitions
- `class_sessions`: generated future scheduled instances
- `bookings`: user/session reservation state
- `classes_feed` view: member-facing class list with available spots
- `bookings_feed` view: booking list enriched with class + location details

## 5) React Query caching behavior in this project

- Query client is created once in `src/app/_layout.tsx`.
- Main query keys live in `src/constants/queryKeys.ts`.
- Read flows (`classes`, `bookings`, `admin data`) use `useQuery`.
- Write flows (`book`, `cancel`, `create/update templates`, `location changes`) use `useMutation` and invalidate relevant keys.
- This keeps data fresh without manual state syncing in each screen.

## 6) Version notes found in repo

- FastAPI pinned in `backend/requirements.txt` to `0.116.1`.
- React Query pinned in `package.json` to `@tanstack/react-query ^5.100.14`.
- Both align with current major usage patterns in this codebase:
  - FastAPI async endpoints + dependency injection
  - React Query v5 object-style hooks (`useQuery({ ... })`, `useMutation({ ... })`)
