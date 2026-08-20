# Backend ↔ Frontend API Integration

This document explains how the mobile app (Expo/React Native) talks to the FastAPI backend, how data is read into the React Query cache, and what every mutation does.

## 1. Architecture at a glance

```
Expo/React Native app (src/)
   │  Supabase JS SDK ── auth (login, sessions)
   │  apiRequest() ── HTTP (fetch) ──► FastAPI backend (backend/app/main.py)
                                             │  asyncpg
                                             ▼
                                        Postgres (Supabase)
```

- **Auth is owned by Supabase.** The app sends the Supabase access token as `Authorization: Bearer <token>`. The backend **never trusts a `user_id` from the request body** — it calls Supabase Auth `/auth/v1/user` with that token, gets the real `id`, and uses it as the trusted identity.
- **Base URL** comes from `EXPO_PUBLIC_API_BASE_URL` (default `http://localhost:8080`) — `src/lib/env.ts`.

### Key files

- App shell + QueryClient provider: `src/app/_layout.tsx`
- HTTP client with bearer token: `src/services/api/client.ts`
- Auth state sync (role, profile): `src/features/auth/hooks/useAuthState.tsx`
- Query cache keys: `src/constants/queryKeys.ts`
- Per-feature services + hooks: `src/features/*/services`, `src/features/*/hooks`
- FastAPI endpoints: `backend/app/main.py`
- Backend settings/env: `backend/app/config.py`

## 2. The shared HTTP layer (`src/services/api/client.ts`)

Every network call funnels through `apiRequest()`:

1. Builds headers: `Content-Type: application/json` when a body exists.
2. If `auth: true` (default), grabs a fresh token via `supabase.auth.getSession()` and sets `Authorization: Bearer <token>`.
3. `fetch(apiUrl(path), ...)`, parses JSON, and on non-2xx throws an `ApiError` carrying the backend's `message` and `error_code`.
4. Exposes `apiGet`, `apiPost`, `apiPatch`, `apiDelete`.

The backend error contract is `{ success: false, message, error_code }` (the `ApiResponse` model, `backend/app/main.py`). Frontend screens match on `error_code` via `isApiErrorWithCode` + `BOOKING_ERROR_CODES` (`src/features/bookings/constants/bookingErrorCodes.ts`), e.g. `CLASS_FULL`, `ALREADY_BOOKED`.

## 3. React Query cache wiring

- A single `QueryClient` is created in `src/app/_layout.tsx` and provided by `QueryClientProvider` at the root. All screens share one cache.
- **Cache keys** are centralized in `src/constants/queryKeys.ts`. Examples:
  - `["classes"]`, `["classes", date | "all"]`, `["classes", "detail", id]`
  - `["classes", "templates", "public"]` (member-facing class templates)
  - `["admin", "class-templates"]`, `["admin", "locations"]`, `["admin", "class-types"]`
  - `["bookings", userId]`, `["bookings", "all", userId]`
- Data lives in the cache under these keys; screens render from `query.data`, and mutations **invalidate** (mark stale → refetch) the relevant keys on success.

## 4. READ flow — how data gets into the cache

Example: the member "Classes" list.

1. **Route** `src/app/(tabs)/classes.tsx` → **`ClassesScreen`** (`src/features/classes/screens/ClassesScreen.tsx`).
2. It calls **`usePublicClassTemplates()`** (`src/features/classes/hooks/useClasses.ts`) → `useQuery({ queryKey: ["classes","templates","public"], queryFn: fetchPublicClassTemplates })`.
3. **`fetchPublicClassTemplates`** (`src/features/classes/services/classesService.ts`) → `apiGet("/class-templates/public", { auth: false })`.
4. **Backend** `GET /class-templates/public` runs a JOIN of `class_templates` + `class_types` + `locations` filtered by `is_active = true`, returning rows serialized to dicts (dates/times → ISO strings via `_record_to_dict`).
5. Result is stored under the query key. While cached, remounts render instantly without refetching; invalidation (below) triggers fresh GETs.

Other read examples:

- `useClasses` → `GET /classes` (public feed from the `classes_feed` view).
- `useClass` → `GET /classes/{id}`.
- `useMyBookings` → `GET /bookings/me` (auth; backend adds `cancellable` + `cancellation_window_hours` computed from `admin_settings`).
- `useAllBookings` → `GET /admin/bookings` (admin).
- `useActiveLocations` → `GET /locations/active`.
- `useActiveClassTypes` → `GET /tipos-clase/active`.
- `usePublicClassTemplate` → `GET /class-templates/public/{id}`.

### Auth model for reads

- **Public (no auth):** `/classes`, `/classes/{id}`, `/class-templates/public(/{id})`, `/locations/active`, `/tipos-clase/active`.
- **Bearer token required:** `/bookings/me`, `/me`, `/subscriptions/me`.
- **Admin required (`role = 'admin'` in `profiles`):** `/admin/*`.

## 5. WRITE flow — "Add a class" end to end

### 5.1 Frontend components

1. **Route** `src/app/admin/classes.tsx` → **`AdminClassesScreen`** (`src/features/admin/screens/AdminClassesScreen.tsx`).
2. On mount it loads three reference queries into the cache (all gated on `role === "admin"`):
   - `templatesQuery` → key `["admin","class-templates"]` → `fetchClassTemplates` → `GET /admin/classes`
   - `locationsQuery` → key `["admin","locations"]` → `fetchLocations` → `GET /admin/locations`
   - `classTypesQuery` → `useActiveClassTypes` → key `["class-types","active"]` → `GET /tipos-clase/active`
3. Admin taps **"Nueva"** → `startNewTemplate()` resets the **react-hook-form** form (validated by a **zod** schema) and shows the form.
4. Inputs feed form state: text `Input`s; **`ClassTypePickerModal`** (type picker, options from cache); day-of-week chips; **`TimePickerModal`**; location radio list (options from cache).
5. Admin taps **"Crear Clase"** → `handleSubmit(values => saveMutation.mutate(values))`. Zod validation must pass.

### 5.2 The mutation

```ts
saveMutation = useMutation({
  mutationFn: async (values) => {
    const payload = {
      ...values,
      days_of_week_mask: maskFromDays(values.days_of_week),
      valid_until: values.valid_until || null,
      is_active: selectedTemplate?.is_active ?? true,
    };
    return selectedTemplate
      ? updateClassTemplate(selectedTemplate.id, payload)
      : createClassTemplate(payload);
  },
  onSuccess: async () => {
    await invalidateClassData();
    setSelectedTemplate(null);
    setIsFormVisible(false);
    reset(emptyValues);
    Alert.alert("Saved", "Recurring class template saved.");
  },
  onError: (error) => Alert.alert("Save failed", (error as Error).message),
});
```

- Since no template is selected, it calls **`createClassTemplate`** (`classesService.ts`) → `apiPost<ClassTemplate>("/admin/classes", input)`.
- `apiPost` → `apiRequest` attaches `Authorization: Bearer <fresh Supabase token>` and POSTs JSON to `${API_BASE_URL}/admin/classes`.

### 5.3 Backend

`POST /admin/classes` (`backend/app/main.py`), dependency **`require_admin_user`**:

1. **`get_user_id`** reads the `Authorization` header → calls Supabase Auth `/auth/v1/user` → returns the real user `id` (else 401).
2. **`require_admin_user`** checks `profiles.role` for that id — must be `"admin"` (else 403).
3. In a **transaction**:
   - Verifies the `location_id` exists (else 404).
   - `_ensure_active_class_type` (else 400 "tipo de clase invalido o inactivo").
   - `INSERT` into `class_templates` (title, description, trainer, class_type, duration, `days_of_week_mask`, `start_time`, `capacity`, `difficulty_level`, location, `valid_from`/`valid_until`, `created_by`, `is_active`).
   - `_update_future_class_session_capacity` propagates the capacity to future `class_sessions`.
4. Returns the created row; Postgres errors are translated into typed 4xx/5xx responses.

### 5.4 Back to the cache

- `saveMutation.onSuccess` → **`invalidateClassData()`** invalidates `["admin","class-templates"]`, `["classes"]` (all class feeds), and `["classes","templates","public"]`.
- Those keys are now stale → active queries refetch → the new class template shows in the admin list **and** in member-facing screens (`ClassesScreen`, `BookClassScreen`) since they share the same cache keys.

### 5.5 The other admin class mutation

- **Toggle active**: the ACTIVE/INACTIVE pill → `activeMutation` → `setClassTemplateActive` → `PATCH /admin/classes/{id}/active` flips `is_active`; same invalidation set.

## 6. Every mutation and what it does

| Mutation (hook/screen) | Service fn → HTTP | Backend endpoint | What backend does | Cache invalidation |
|---|---|---|---|---|
| **Book a class** (`useBookClass`, used by `BookClassScreen`) | `bookClass` → `POST /bookings` `{template_id, requested_date, location_id}` | `POST /bookings` | Validates location active, template active, date vs `days_of_week_mask`/validity; upserts `class_sessions`; checks capacity (`CLASS_FULL`), duplicate (`ALREADY_BOOKED`); inserts confirmed booking | `["bookings", userId]`, `["bookings","all",userId]`, `["classes"]` |
| **Cancel booking** (`useCancelBooking`, `MyBookingsScreen`) | `cancelBooking` → `POST /bookings/cancel` `{session_id}` | `POST /bookings/cancel` | Verifies owned confirmed booking; enforces cancellation window from `admin_settings` (else 423 `CANCELLATION_WINDOW_CLOSED`); sets status `cancelled` | same three keys |
| **Create / update class template** (`AdminClassesScreen`) | `createClassTemplate` / `updateClassTemplate` → `POST` / `PATCH /admin/classes(/{id})` | `POST /admin/classes`, `PATCH /admin/classes/{id}` | Admin-only insert/update + capacity sync to future sessions | `classTemplates`, `classes`, `publicClassTemplates` |
| **Toggle class active** | `setClassTemplateActive` → `PATCH /admin/classes/{id}/active` | `PATCH /admin/classes/{id}/active` | Flips `is_active` | same as above |
| **Create / update location** (`AdminLocationsScreen`) | `createLocation` / `updateLocation` → `POST` / `PATCH /admin/locations(/{id})` | `POST /admin/locations`, `PATCH /admin/locations/{id}` | Admin insert/update | `["admin","locations"]` |
| **Toggle location active** | `setLocationActive` → `PATCH /admin/locations/{id}/active` | `PATCH /admin/locations/{id}/active` | Flips `is_active` | `["admin","locations"]` |
| **Create / update class type** (`AdminClassTypesScreen`) | `createClassType` / `updateClassType` → `POST` / `PATCH /admin/tipos-clase(/{id})` | `POST /admin/tipos-clase`, `PATCH /admin/tipos-clase/{id}` | Admin insert/update (`slug` lowercased) | `classTypes`, `activeClassTypes`, `classTemplates`, `publicClassTemplates` |
| **Toggle / delete class type** | `setClassTypeActive` → `PATCH /admin/tipos-clase/{id}/active`; `deleteClassType` → `DELETE /admin/tipos-clase/{id}` | `PATCH /admin/tipos-clase/{id}/active`, `DELETE /admin/tipos-clase/{id}` | Flips active; delete blocked if in use (409) | same four keys |
| **Update cancellation window** (`AdminSettingsScreen`) | `updateCancellationWindow` → `PATCH /admin/settings` | `PATCH /admin/settings` | Upserts `admin_settings.cancellation_window_hours` (min 0.5) — feeds every cancel / `cancellable` check | `["admin","settings"]` |
| **Mark attendance** (`AdminAttendanceScreen`) | `setBookingAttendance` → `PATCH /admin/bookings/{id}/attendance` | `PATCH /admin/bookings/{id}/attendance` | Updates `bookings.attended` | `adminAttendance`, `adminUsers` (attended count) |
| **Create / update user subscription** (`AdminSubscriptionsScreen`) | `createUserSubscription` / `updateUserSubscription` → `POST` / `PATCH /admin/users/{id}/subscription` | `POST /admin/users/{id}/subscription`, `PATCH /admin/users/{id}/subscription` | Insert/update `subscriptions` (unique `stripe_subscription_id`) | `adminUsers` |
| **Update own profile** (`EditProfileScreen`) | `updateMyProfile` → `PATCH /me` | `PATCH /me` | Partial update of `profiles` | `["me"]` via `refreshProfile` |
| **Ensure profile exists** (auto on sign-in, `useAuthState`) | `createUserProfileIfMissing` → `POST /profiles/me/ensure` | `POST /profiles/me/ensure` | Idempotent `INSERT ... ON CONFLICT DO NOTHING` using metadata | n/a |
| **Register push token** (`useNotifications`) | `apiPost("/notification-tokens", ...)` | `POST /notification-tokens` | Upsert `notification_tokens` | n/a |

## 7. Key takeaways

- **Reads = queries** (GET, keyed cache); **writes = mutations** (POST/PATCH/DELETE, auth required, then `invalidateQueries` so the cache refetches the source of truth).
- The backend never accepts a client-supplied `user_id` — identity is derived server-side from the Supabase bearer token; admin endpoints additionally require `role = 'admin'` in `profiles`.
- `error_code`s flow back from the backend through `ApiError.code` so screens can show localized/typed errors (e.g. `CLASS_FULL`, `ALREADY_BOOKED`, `CANCELLATION_WINDOW_CLOSED`).