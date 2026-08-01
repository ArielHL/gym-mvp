import { ActivityIndicator, Text, View } from 'react-native';

export function LoadingView({ label = 'Loading...' }: { label?: string }) {
  return (
    <View className="flex-1 items-center justify-center">
      <ActivityIndicator size="large" color="#22D3EE" />
      <Text className="mt-3 text-neutral-300">{label}</Text>
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
      <Text className="text-neutral-300">{message}</Text>
    </View>
  );
}
