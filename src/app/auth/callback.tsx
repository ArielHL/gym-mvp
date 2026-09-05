import { useEffect, useState } from 'react';
import { ActivityIndicator, Platform, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { supabase } from '@/services/supabase/client';
import { colors } from '@/theme';

import { Text } from "@/components/ui/Text";
function firstParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

export default function AuthCallbackScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{
    code?: string | string[];
    error?: string | string[];
    error_description?: string | string[];
  }>();
  const [message, setMessage] = useState('Finishing sign in...');

  useEffect(() => {
    let cancelled = false;

    const finishSignIn = async () => {
      const error = firstParam(params.error);
      const errorDescription = firstParam(params.error_description);

      if (error) {
        setMessage(errorDescription ?? 'Google sign-in failed.');
        setTimeout(() => {
          if (!cancelled) {
            router.replace('/auth');
          }
        }, 1200);
        return;
      }

      if (Platform.OS === 'web') {
        const code = firstParam(params.code);

        if (code) {
          const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
          if (exchangeError) {
            if (!cancelled) {
              setMessage(exchangeError.message);
              setTimeout(() => {
                if (!cancelled) {
                  router.replace('/auth');
                }
              }, 1200);
            }
            return;
          }
        }
      }

      if (!cancelled) {
        router.replace('/(tabs)');
      }
    };

    finishSignIn().catch((error: unknown) => {
      if (!cancelled) {
        setMessage(error instanceof Error ? error.message : 'Google sign-in failed.');
        setTimeout(() => {
          if (!cancelled) {
            router.replace('/auth');
          }
        }, 1200);
      }
    });

    return () => {
      cancelled = true;
    };
  }, [params.code, params.error, params.error_description, router]);

  return (
    <View className="flex-1 items-center justify-center gap-4 bg-background px-6">
      <ActivityIndicator color={colors.accent.cyan} />
      <Text className="text-center text-sm font-semibold text-muted">{message}</Text>
    </View>
  );
}
