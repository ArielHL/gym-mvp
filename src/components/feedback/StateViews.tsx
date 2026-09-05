import { ActivityIndicator, View } from 'react-native';
import { colors } from '@/theme';

import { Text } from "@/components/ui/Text";
export function LoadingView({ label = 'Loading...' }: { label?: string }) {
  return (
    <View className="flex-1 items-center justify-center">
      <ActivityIndicator size="large" color={colors.accent.cyan} />
      <Text className="mt-3 text-muted">{label}</Text>
    </View>
  );
}

export function ErrorView({ message }: { message: string }) {
  return (
    <View className="rounded-xl border border-rose-900 bg-rose-950 p-3">
      <Text className="text-rose-200">{message}</Text>
    </View>
  );
}

export function EmptyView({ message }: { message: string }) {
  return (
    <View className="rounded-xl border border-border bg-surface p-4">
      <Text className="text-muted">{message}</Text>
    </View>
  );
}
