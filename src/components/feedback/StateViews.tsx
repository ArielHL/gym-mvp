import { ActivityIndicator, Text, View } from 'react-native';

export function LoadingView({ label = 'Loading...' }: { label?: string }) {
  return (
    <View className="flex-1 items-center justify-center">
      <ActivityIndicator size="large" color="#0891B2" />
      <Text className="mt-3 text-slate-300">{label}</Text>
    </View>
  );
}

export function ErrorView({ message }: { message: string }) {
  return (
    <View className="rounded-xl border border-rose-800 bg-rose-950 p-3">
      <Text className="text-rose-200">{message}</Text>
    </View>
  );
}

export function EmptyView({ message }: { message: string }) {
  return (
    <View className="rounded-xl border border-slate-800 bg-slate-900 p-4">
      <Text className="text-slate-300">{message}</Text>
    </View>
  );
}
