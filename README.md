# Gym Mobile MVP (Expo + Firebase)

## 1) Architecture Summary
- Single React Native codebase (Expo + TypeScript) for iOS and Android.
- Feature-first frontend modules under `src/features/*` with co-located `screens`, `hooks`, `services`, and `components`.
- Firebase backend with Auth, Firestore, Cloud Functions, FCM, and optional Storage.
- Server-enforced booking business rules via callable Cloud Functions and Firestore transactions.
- React Query for API/cache state, React Hook Form + Zod for robust form validation.

## 2) Folder Tree
```text
gym-mvp/
  App.tsx
  app.json
  babel.config.js
  tsconfig.json
  package.json
  .env.example
  firebase.json
  .firebaserc
  firestore.rules
  firestore.indexes.json
  src/
    app/navigation/AppNavigator.tsx
    components/
      feedback/StateViews.tsx
      ui/Button.tsx
      ui/Input.tsx
      ui/Screen.tsx
    constants/queryKeys.ts
    features/
      auth/
        components/SocialLoginButtons.tsx
        hooks/useAuthState.tsx
        screens/LoginScreen.tsx
        screens/RegisterScreen.tsx
        services/authService.ts
      classes/
        components/ClassCard.tsx
        hooks/useClasses.ts
        screens/ClassesScreen.tsx
        screens/ClassDetailsScreen.tsx
        services/classesService.ts
      bookings/
        hooks/useBookings.ts
        screens/MyBookingsScreen.tsx
        services/bookingsService.ts
      profile/screens/ProfileScreen.tsx
      home/screens/HomeScreen.tsx
      core/screens/SplashScreen.tsx
    hooks/useNotifications.ts
    lib/env.ts
    services/firebase/client.ts
    services/userService.ts
    types/models.ts
    types/navigation.ts
    utils/date.ts
  functions/
    package.json
    tsconfig.json
    src/index.ts
  seed/
    classes.seed.json
    import-classes.mjs
    seed-info.js
```

## 3) Dependencies
### Mobile App
- Expo / React Native / TypeScript
- React Navigation (stack + tabs)
- TanStack Query
- Firebase JS SDK
- React Hook Form + Zod
- NativeWind + TailwindCSS
- Expo Auth Session (Google/Facebook), Apple Auth, Notifications

### Cloud Functions
- firebase-admin
- firebase-functions
- zod

## 4) Environment Variables Needed
Copy `.env.example` to `.env` and fill:
- `EXPO_PUBLIC_FIREBASE_API_KEY`
- `EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN`
- `EXPO_PUBLIC_FIREBASE_PROJECT_ID`
- `EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET`
- `EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID`
- `EXPO_PUBLIC_FIREBASE_APP_ID`
- `EXPO_PUBLIC_FIREBASE_IOS_CLIENT_ID`
- `EXPO_PUBLIC_FIREBASE_ANDROID_CLIENT_ID`
- `EXPO_PUBLIC_FACEBOOK_APP_ID`

## 5) Firestore Schema / Types
Canonical app types are in `src/types/models.ts`:
- `users`
- `classes`
- `bookings`
- `notification_tokens`

Also includes:
- `BookingStatus`
- `CallableResponse<T>`

## 6) Frontend Code by Module
- Auth: login/register + social providers + persistent auth listener + profile bootstrap.
- Classes: calendar/day filtering + class details + full/remaining spots states.
- Bookings: my bookings list + booked-status query + book/cancel mutations.
- Profile: account info + logout.
- Home: greeting + notification token registration.

## 7) Cloud Functions Code
Located in `functions/src/index.ts`:
- `createUserProfileOnFirstLogin`
- `bookClass` (atomic transaction, duplicate/full checks)
- `cancelBooking` (atomic restore of `available_spots`)
- `sendBookingConfirmation`
- `sendClassReminder` (scheduled)

## 8) Firestore Security Rules
Rules file: `firestore.rules`
- Authenticated class reads
- User-owned profile access only
- User-owned booking reads/writes only
- Class writes denied from client (capacity controlled by trusted backend)

## 9) Seed Data
Seed file: `seed/classes.seed.json`

Import command:
```bash
node seed/import-classes.mjs
```

Prerequisite:
```bash
# Windows PowerShell example
$env:GOOGLE_APPLICATION_CREDENTIALS="C:\\path\\to\\service-account.json"
```

## 10) Setup Instructions
### Prerequisites
- Node.js 20+
- Expo CLI
- Firebase CLI

### Install and Run Mobile App
```bash
npm install
npm run start
```

### Install and Run Functions Locally
```bash
cd functions
npm install
npm run build
cd ..
firebase emulators:start
```

### Configure Firebase
1. Create Firebase project.
2. Enable Auth providers: Email/Password, Google, Facebook, Apple.
3. Enable Firestore, Cloud Functions, Cloud Messaging, Storage.
4. Set `.firebaserc` project id.
5. Deploy backend:
```bash
firebase deploy --only functions,firestore:rules,firestore:indexes
```

### Notes
- Social login requires provider console configuration and callback URIs.
- Apple Sign-In requires iOS device/simulator setup and Apple capabilities.
- FCM in Expo managed workflow requires EAS credentials for production push delivery.
