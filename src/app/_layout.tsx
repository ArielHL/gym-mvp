import 'react-native-gesture-handler';
import '../../global.css';
import { useEffect } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { Slot, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider, useAuthState } from '@/features/auth/hooks/useAuthState';
import { AppErrorBoundary } from '@/components/feedback/AppErrorBoundary';

const queryClient = new QueryClient();

function RootLayoutNav() {
  const { user, initializing } = useAuthState();
  const router = useRouter();
  const segments = useSegments();

  useEffect(() => {
    if (initializing) return;

    const inTabs = segments[0] === '(tabs)';
    const inPublicAuthFlow = segments[0] === 'index' || segments[0] === 'auth' || segments[0] === 'register';

    if (user && inPublicAuthFlow) {
      router.replace('/(tabs)');
    } else if (!user && inTabs) {
      router.replace('/');
    }
  }, [user, initializing, segments, router]);

  if (initializing) {
    return (
      <View style={{ flex: 1, backgroundColor: '#0A0A0A', alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator size="large" color="#22D3EE" />
      </View>
    );
  }

  return <Slot />;
}

export default function RootLayout() {
  return (
    <AppErrorBoundary>
      <GestureHandlerRootView style={{ flex: 1 }}>
        <SafeAreaProvider>
          <QueryClientProvider client={queryClient}>
            <AuthProvider>
              <StatusBar style="light" />
              <RootLayoutNav />
            </AuthProvider>
          </QueryClientProvider>
        </SafeAreaProvider>
      </GestureHandlerRootView>
    </AppErrorBoundary>
  );
}
