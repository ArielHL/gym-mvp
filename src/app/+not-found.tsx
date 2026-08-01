import { Link, Stack } from 'expo-router';
import { Text, View } from 'react-native';

export default function NotFoundScreen() {
  return (
    <>
      <Stack.Screen options={{ title: 'Not Found' }} />
      <View className="flex-1 items-center justify-center gap-4 bg-neutral-950 px-6">
        <Text className="text-center text-3xl font-black text-white">Route not found</Text>
        <Text className="text-center text-sm text-neutral-400">
          This screen does not exist in the gym app.
        </Text>
        <Link href="/" className="rounded-xl bg-cyan-400 px-5 py-3 text-sm font-bold text-black">
          Go home
        </Link>
      </View>
    </>
  );
}
