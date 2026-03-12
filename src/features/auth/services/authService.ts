import { Platform } from 'react-native';
import { makeRedirectUri } from 'expo-auth-session';
import * as WebBrowser from 'expo-web-browser';
import type { Provider } from '@supabase/supabase-js';
import { supabase } from '@/services/supabase/client';

WebBrowser.maybeCompleteAuthSession();

async function signInWithOAuth(provider: Provider) {
  const redirectTo = makeRedirectUri({ scheme: 'gymmobilemvp', path: 'auth/callback' });

  if (Platform.OS === 'web') {
    const { error } = await supabase.auth.signInWithOAuth({ provider, options: { redirectTo } });
    if (error) {
      throw error;
    }
    return;
  }

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider,
    options: {
      redirectTo,
      skipBrowserRedirect: true
    }
  });

  if (error) {
    throw error;
  }

  if (!data?.url) {
    throw new Error('OAuth URL was not returned by Supabase.');
  }

  const result = await WebBrowser.openAuthSessionAsync(data.url, redirectTo);
  if (result.type !== 'success' || !result.url) {
    throw new Error('OAuth login was cancelled.');
  }

  const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(result.url);
  if (exchangeError) {
    throw exchangeError;
  }
}

export const authService = {
  register: async (email: string, password: string) => {
    const { error } = await supabase.auth.signUp({ email, password });
    if (error) {
      throw error;
    }
  },
  login: async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      throw error;
    }
  },
  logout: async () => {
    const { error } = await supabase.auth.signOut();
    if (error) {
      throw error;
    }
  },
  loginWithGoogle: () => {
    return signInWithOAuth('google');
  },
  loginWithFacebook: () => {
    return signInWithOAuth('facebook');
  },
  loginWithApple: () => {
    return signInWithOAuth('apple');
  }
};
