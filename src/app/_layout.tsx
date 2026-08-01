import 'react-native-gesture-handler';
import '../../global.css';
import { useEffect } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { Stack, useRouter, useSegments } from 'expo-router';
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
    const inProtectedRoute = inTabs || segments[0] === 'classes' || segments[0] === 'bookings';
    const inPublicRoute = segments[0] === '(public)';

    if (user && inPublicRoute) {
      router.replace('/(tabs)');
    } else if (!user && inProtectedRoute) {
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

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="(public)" />
      <Stack.Screen name="(tabs)" />
      <Stack.Screen name="classes/[classId]" />
      <Stack.Screen name="bookings/new" />
      <Stack.Screen name="+not-found" />
    </Stack>
  );
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
