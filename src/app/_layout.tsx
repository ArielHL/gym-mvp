import "react-native-gesture-handler";
import "../../global.css";
import { useEffect, useRef } from "react";
import { useFonts } from "expo-font";
import { NavigationBar } from "expo-navigation-bar";
import { Stack, useRouter, useSegments } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { AuthProvider, useAuthState } from "@/features/auth/hooks/useAuthState";
import { AppErrorBoundary } from "@/components/feedback/AppErrorBoundary";
import { fontAssets } from "@/theme";

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
    if (initializing) return; // get out of the effect if we're still initializing

    const rootSegment = segments[0] as string | undefined;
    const inProtectedRoute = rootSegment === "bookings";
    const inAdminRoute =
      rootSegment === "admin" ||
      (rootSegment === "(tabs)" && segments[1] === "admin");
    const isProfileRoute = rootSegment === "profile";
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
    } else if (!user && isProfileRoute) {
      router.replace("/(tabs)");
    } else if (!user && (inProtectedRoute || inAdminRoute)) {
      router.replace("/(tabs)");
    } else if (user && inAdminRoute && role !== "admin") {
      router.replace("/(tabs)");
    }
  }, [user, role, initializing, segments, router]);

  return <Stack screenOptions={{ headerShown: false }} />;
}

export default function RootLayout() {
  const hasCustomFonts = Object.keys(fontAssets).length > 0;
  const [fontsLoaded] = useFonts(fontAssets);

  if (hasCustomFonts && !fontsLoaded) {
    return null;
  }

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
