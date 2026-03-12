import Constants from 'expo-constants';

const extra = Constants.expoConfig?.extra ?? {};

export const env = {
  supabaseUrl: process.env.EXPO_PUBLIC_SUPABASE_URL ?? '',
  supabaseAnonKey: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? '',
  apiBaseUrl: process.env.EXPO_PUBLIC_API_BASE_URL ?? 'http://localhost:8080',
  easProjectId: (extra as { eas?: { projectId?: string } }).eas?.projectId ?? ''
};

export const hasSupabaseConfig = !!env.supabaseUrl && !!env.supabaseAnonKey;
