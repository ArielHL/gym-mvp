import "react-native-gesture-handler";
import "../../global.css";
import { useEffect, useRef } from "react";
import { useFonts } from "expo-font";
import { NavigationBar } from "expo-navigation-bar";
import { Stack, useRouter, useSegments } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { Platform, View } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { AuthProvider, useAuthState } from "@/features/auth/hooks/useAuthState";
import { hasAdminAccess } from "@/features/auth/role";
import { AlertHost } from "@/components/feedback/AppAlert";
import { AppErrorBoundary } from "@/components/feedback/AppErrorBoundary";
import { colors, fontAssets } from "@/theme";

const isWeb = Platform.OS === "web";
const webShellStyle = {
  flex: 1,
  width: "100%" as const,
  maxWidth: 1100,
  alignSelf: "center" as const,
};

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
    } else if (user && inAdminRoute && !hasAdminAccess(role)) {
      router.replace("/(tabs)");
    }
  }, [user, role, initializing, segments, router]);

  return <Stack screenOptions={{ headerShown: false }} />;
}

export default function RootLayout() {
  const hasCustomFonts = Object.keys(fontAssets).length > 0;
  const [fontsLoaded] = useFonts(fontAssets);

  useEffect(() => {
    if (!isWeb || typeof document === "undefined") return;
    const previousHtml = document.documentElement.style.backgroundColor;
    const previousBody = document.body.style.backgroundColor;
    document.documentElement.style.backgroundColor = colors.background;
    document.body.style.backgroundColor = colors.background;
    return () => {
      document.documentElement.style.backgroundColor = previousHtml;
      document.body.style.backgroundColor = previousBody;
    };
  }, []);

  if (hasCustomFonts && !fontsLoaded) {
    return null;
  }

  return (
    <AppErrorBoundary>
      <View style={{ flex: 1, backgroundColor: colors.background }}>
        <GestureHandlerRootView style={isWeb ? webShellStyle : { flex: 1 }}>
          <SafeAreaProvider>
            <QueryClientProvider client={queryClient}>
              <AuthProvider>
                <NavigationBar style="dark" />
                <StatusBar style="light" />
                <RootLayoutNav />
                <AlertHost />
              </AuthProvider>
            </QueryClientProvider>
          </SafeAreaProvider>
        </GestureHandlerRootView>
      </View>
    </AppErrorBoundary>
  );
}
