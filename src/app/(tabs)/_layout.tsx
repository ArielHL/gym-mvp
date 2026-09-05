import { Tabs } from "expo-router";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Avatar } from "@/features/profile/screens/ProfileScreen";
import { useAuthState } from "@/features/auth/hooks/useAuthState";
import { colors, fonts } from "@/theme";

export default function TabsLayout() {
  const insets = useSafeAreaInsets();
  const bottomInset = Math.max(insets.bottom, 20);
  const { user, role, displayName, avatarUrl } = useAuthState();

  return (
    <Tabs
      backBehavior="history"
      screenOptions={{
        headerShown: false,
            tabBarActiveTintColor: colors.accent.cyan,
        tabBarInactiveTintColor: colors.muted,
        tabBarStyle: {
          backgroundColor: colors.tabBar,
          borderTopWidth: 0,
          height: 58 + bottomInset,
          paddingTop: 8,
          paddingBottom: bottomInset,
        },
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: "600",
          fontFamily: fonts.sans || undefined,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Home",
          tabBarIcon: ({ color, size }) => (
            <MaterialCommunityIcons
              name="home-variant"
              size={size}
              color={String(color)}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="classes"
        options={{
          title: "Clases",
          tabBarIcon: ({ color, size }) => (
            <MaterialCommunityIcons
              name="dumbbell"
              size={size}
              color={String(color)}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="bookings"
        options={{
          title: "Reservas",
          tabBarIcon: ({ color, size }) => (
            <MaterialCommunityIcons
              name="calendar-check"
              size={size}
              color={String(color)}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="admin"
        options={{
          title: "Admin",
          href: role === "admin" ? "/admin/classes" : null,
          tabBarIcon: ({ color, size }) => (
            <MaterialCommunityIcons
              name="view-dashboard"
              size={size}
              color={String(color)}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: "Perfil",
          tabBarIcon: ({ color, size }) =>
            user && avatarUrl ? (
              <Avatar
                name={displayName ?? ""}
                avatarUrl={avatarUrl}
                size={size}
              />
            ) : (
              <MaterialCommunityIcons
                name="account-circle"
                size={size}
                color={String(color)}
              />
            ),
        }}
      />
    </Tabs>
  );
}
