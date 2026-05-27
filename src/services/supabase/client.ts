import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';
import { env } from '@/lib/env';

const fallbackSupabaseUrl = 'https://placeholder.supabase.co';
const fallbackSupabaseAnonKey = 'placeholder-anon-key';

const supabaseUrl = env.supabaseUrl || fallbackSupabaseUrl;
const supabaseAnonKey = env.supabaseAnonKey || fallbackSupabaseAnonKey;

if (!env.supabaseUrl || !env.supabaseAnonKey) {
  // Keep the app bootable in dev when env vars are missing and surface a clear warning.
  console.warn('Supabase env vars are missing. Add EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY.');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false
  }
});
