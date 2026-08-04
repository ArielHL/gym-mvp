import { Platform } from 'react-native';
import { makeRedirectUri } from 'expo-auth-session';
import * as QueryParams from 'expo-auth-session/build/QueryParams';
import * as WebBrowser from 'expo-web-browser';
import type { Provider } from '@supabase/supabase-js';
import { supabase } from '@/services/supabase/client';
import { createUserProfileIfMissing } from '@/services/userService';

WebBrowser.maybeCompleteAuthSession();

function mapOAuthError(error: unknown): Error {
  const message = String((error as { message?: string })?.message ?? error ?? 'OAuth login failed.');
  const lowered = message.toLowerCase();

  if (lowered.includes('provider is not enabled') || lowered.includes('unsupported provider')) {
    return new Error('Google sign-in is not enabled in Supabase Authentication providers.');
  }

  if (lowered.includes('redirect') && lowered.includes('url')) {
    return new Error('OAuth redirect URL is not allowed. Add gymmobilemvp://auth/callback in Supabase redirect URLs.');
  }

  return error instanceof Error ? error : new Error(message);
}

async function signInWithOAuth(provider: Provider) {
  const redirectTo = makeRedirectUri({ scheme: 'gymmobilemvp', path: 'auth/callback' });

  if (Platform.OS === 'web') {
    const { error } = await supabase.auth.signInWithOAuth({ provider, options: { redirectTo } });
    if (error) {
      throw mapOAuthError(error);
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
    throw mapOAuthError(error);
  }

  if (!data?.url) {
    throw new Error('OAuth URL was not returned by Supabase.');
  }

  const result = await WebBrowser.openAuthSessionAsync(data.url, redirectTo);
  if (result.type !== 'success' || !result.url) {
    throw new Error('OAuth login was cancelled.');
  }

  const { params, errorCode } = QueryParams.getQueryParams(result.url);
  if (errorCode) {
    throw mapOAuthError(errorCode);
  }

  const code = params.code;
  if (!code) {
    throw new Error('OAuth login did not return an authorization code.');
  }

  const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
  if (exchangeError) {
    throw mapOAuthError(exchangeError);
  }
}

export const authService = {
  register: async (email: string, password: string, fullName?: string): Promise<{ emailConfirmationRequired: boolean }> => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { full_name: fullName ?? '' }
      }
    });
    if (error) {
      throw error;
    }
    if (data.session && data.user) {
      await createUserProfileIfMissing(data.user);
    }
    // session is null when Supabase requires email confirmation
    const emailConfirmationRequired = !data.session;
    return { emailConfirmationRequired };
  },
  login: async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      if (error.message?.toLowerCase().includes('email not confirmed')) {
        throw new Error('Please confirm your email address before signing in. Check your inbox for a confirmation link.');
      }
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
