import "react-native-gesture-handler";
import "../../global.css";
import { useEffect, useRef } from "react";
import { NavigationBar } from "expo-navigation-bar";
import { Stack, useRouter, useSegments } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { AuthProvider, useAuthState } from "@/features/auth/hooks/useAuthState";
import { AppErrorBoundary } from "@/components/feedback/AppErrorBoundary";

const queryClient = new QueryClient();

export const unstable_settings = {
  initialRouteName: "(tabs)",
};

function RootLayoutNav() {
  const { user, role, initializing } = useAuthState();
  const router = useRouter();
  const segments = useSegments();
  const wasAuthenticated = useRef(false);

  useEffect(() => {
    if (initializing) return;

    const rootSegment = segments[0] as string | undefined;
    const inProtectedRoute = rootSegment === "bookings";
    const inAdminRoute = rootSegment === "admin";
    const inPublicRoute = rootSegment === "(public)";
    const inPublicIndex = inPublicRoute && !segments[1];
    const signedOutAfterSession = wasAuthenticated.current && !user;

    if (user) {
      wasAuthenticated.current = true;
    }

    if (signedOutAfterSession) {
      wasAuthenticated.current = false;
      router.replace("/(tabs)");
    } else if (user && inPublicRoute) {
      router.replace("/(tabs)");
    } else if (!user && inPublicIndex) {
      router.replace("/(tabs)");
    } else if (!user && (inProtectedRoute || inAdminRoute)) {
      router.replace("/(tabs)");
    } else if (user && inAdminRoute && role !== "admin") {
      router.replace("/(tabs)");
    }
  }, [user, role, initializing, segments, router]);

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="(tabs)" />
      <Stack.Screen name="classes/[classId]" />
      <Stack.Screen name="bookings/index" />
      <Stack.Screen name="bookings/new" />
      <Stack.Screen name="admin/classes" />
      <Stack.Screen name="admin/settings" />
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
              <NavigationBar style="dark" />
              <StatusBar style="light" />
              <RootLayoutNav />
            </AuthProvider>
          </QueryClientProvider>
        </SafeAreaProvider>
      </GestureHandlerRootView>
    </AppErrorBoundary>
  );
}
