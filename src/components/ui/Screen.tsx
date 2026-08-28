import { SafeAreaView, type Edge } from "react-native-safe-area-context";
import { ScrollView, type ScrollViewProps, View } from "react-native";
import type { ReactNode } from "react";

interface ScreenProps extends ScrollViewProps {
  children: ReactNode;
  scroll?: boolean;
  edges?: Edge[];
}

export function Screen({
  children,
  scroll = true,
  edges,
  ...rest
}: ScreenProps) {
  return (
    <SafeAreaView className="flex-1 bg-background" edges={edges}>
      {scroll ? (
        <ScrollView
          className="flex-1 px-5"
          contentContainerStyle={{ paddingBottom: 24 }}
          {...rest}
        >
          {children}
        </ScrollView>
      ) : (
        <View className="flex-1 px-5">{children}</View>
      )}
    </SafeAreaView>
  );
}
