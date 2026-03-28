# Run and Test Guide

## Prerequisites
- Node.js 20+
- npm
- Firebase CLI (`npm i -g firebase-tools`)
- Expo Go app (for physical device testing) or Android/iOS simulator

## 1) Install dependencies
From the project root:

```bash
npm install
```

Install Cloud Functions dependencies:

```bash
cd functions
npm install
cd ..
```

Install backend API dependencies:

```bash
cd backend
python -m venv .venv
.venv/Scripts/activate
pip install -r requirements.txt
cd ..
```

## 2) Configure environment
Create a `.env` file in the root (copy from `.env.example` if available) and set your Firebase values:

- `EXPO_PUBLIC_FIREBASE_API_KEY`
- `EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN`
- `EXPO_PUBLIC_FIREBASE_PROJECT_ID`
- `EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET`
- `EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID`
- `EXPO_PUBLIC_FIREBASE_APP_ID`
- `EXPO_PUBLIC_FIREBASE_IOS_CLIENT_ID`
- `EXPO_PUBLIC_FIREBASE_ANDROID_CLIENT_ID`
- `EXPO_PUBLIC_FACEBOOK_APP_ID`

## 3) Run the app
From the project root:

```bash
npm run start
```

Then choose one target:
- Press `a` for Android emulator/device
- Press `i` for iOS simulator (macOS only)
- Press `w` for web

You can also run directly:

```bash
npm run android
npm run ios
npm run web
```

## 4) Run backend functions locally (optional)
To emulate Firebase Functions:

```bash
cd functions
npm run build
cd ..
firebase emulators:start --only functions
```

## 5) Run backend API locally (optional)
From `backend/`:

```bash
.venv/Scripts/activate
uvicorn app.main:app --host 0.0.0.0 --port 8080
```

API health check endpoint: `http://localhost:8080/health`

## 6) Test / validate project
This repo currently provides static quality checks (no dedicated unit test script in `package.json`).

From the project root:

```bash
npm run typecheck
npm run lint
```

For Cloud Functions compile check:

```bash
cd functions
npm run build
cd ..
```

For backend compile check:

```bash
cd backend
.venv/Scripts/activate
python -m compileall app
cd ..
```

## 7) Quick smoke-test checklist
- App boots from Expo without runtime errors.
- Login/register works with your Firebase Auth setup.
- Classes list loads from Firestore.
- Booking and cancel booking flows work.
- If using local Functions emulator, callable functions respond successfully.

## Troubleshooting
- If Expo fails to start, clear cache:

```bash
npx expo start -c
```

- If Firebase emulator command fails, login and verify project:

```bash
firebase login
firebase use --add
```
