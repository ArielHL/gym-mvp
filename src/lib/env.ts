import Constants from 'expo-constants';

const extra = Constants.expoConfig?.extra ?? {};

export const env = {
  firebaseApiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY ?? '',
  firebaseAuthDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN ?? '',
  firebaseProjectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID ?? '',
  firebaseStorageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET ?? '',
  firebaseMessagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID ?? '',
  firebaseAppId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID ?? '',
  firebaseIosClientId: process.env.EXPO_PUBLIC_FIREBASE_IOS_CLIENT_ID ?? '',
  firebaseAndroidClientId: process.env.EXPO_PUBLIC_FIREBASE_ANDROID_CLIENT_ID ?? '',
  facebookAppId: process.env.EXPO_PUBLIC_FACEBOOK_APP_ID ?? '',
  easProjectId: (extra as { eas?: { projectId?: string } }).eas?.projectId ?? ''
};

export const hasFirebaseConfig =
  !!env.firebaseApiKey && !!env.firebaseProjectId && !!env.firebaseAppId;
