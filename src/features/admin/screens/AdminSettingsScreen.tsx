import { ActivityIndicator, Text, View } from "react-native";
import { Screen } from "@/components/ui/Screen";
import { useAuthState } from "@/features/auth/hooks/useAuthState";

export function AdminSettingsScreen() {
  const { role, initializing } = useAuthState();

  if (initializing) {
    return (
      <Screen scroll={false}>
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator color="#22D3EE" />
        </View>
      </Screen>
    );
  }

  if (role !== "admin") {
    return (
      <Screen scroll={false}>
        <View className="flex-1 items-center justify-center px-4">
          <Text className="text-center text-2xl font-bold text-white">
            Admin access required
          </Text>
          <Text className="mt-2 text-center text-sm text-gray-500">
            Only admins can manage class settings.
          </Text>
        </View>
      </Screen>
    );
  }

  return (
    <Screen>
      <Text className="mb-2 mt-4 text-2xl font-bold text-white">
        Class Settings
      </Text>
      <Text className="mb-3 text-sm leading-5 text-gray-400">
        Settings are currently being redesigned for the recurring class model.
      </Text>
      <View className="rounded-2xl border border-border bg-surface p-4">
        <Text className="text-base font-semibold text-white">Coming soon</Text>
        <Text className="mt-2 text-sm text-gray-400">
          Future settings will appear here in upcoming sprints.
        </Text>
      </View>
    </Screen>
  );
}
