import { Pressable, View } from "react-native";
import { Slot, usePathname, useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";

import { Text } from "@/components/ui/Text";
const tabs = [
  { href: "/admin/classes", label: "Clases" },
  { href: "/admin/catalog", label: "Catálogo" },
  { href: "/admin/members", label: "Miembros" },
  { href: "/admin/config", label: "App" },
] as const;

export default function AdminTabsLayout() {
  const pathname = usePathname();
  const router = useRouter();

  return (
    <SafeAreaView className="flex-1 bg-background" edges={["top"]}>
      <View className="flex-row border-b border-border px-2">
        {tabs.map((tab) => {
          const active =
            pathname === tab.href || pathname.startsWith(`${tab.href}/`);
          return (
            <Pressable
              key={tab.href}
              className={`flex-1 items-center border-b-2 py-3 ${active ? "border-accent-cyan" : "border-transparent"}`}
              onPress={() => router.replace(tab.href)}
            >
              <Text
                className={`text-xs font-bold ${active ? "text-accent-cyan" : "text-muted"}`}
              >
                {tab.label}
              </Text>
            </Pressable>
          );
        })}
      </View>
      <View className="flex-1">
        <Slot />
      </View>
    </SafeAreaView>
  );
}
