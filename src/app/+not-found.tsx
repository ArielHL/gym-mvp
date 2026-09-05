import { Link, Stack } from 'expo-router';
import { View } from 'react-native';
import { Text } from '@/components/ui/Text';

export default function NotFoundScreen() {
  return (
    <>
      <Stack.Screen options={{ title: 'Not Found' }} />
      <View className="flex-1 items-center justify-center gap-4 bg-background px-6">
        <Text className="text-center text-3xl font-black text-foreground" variant="title">Route not found</Text>
        <Text className="text-center text-sm text-muted">
          This screen does not exist in the gym app.
        </Text>
        <Link href="/" className="rounded-xl bg-accent-cyan px-5 py-3 text-sm font-bold text-inverse">
          Go home
        </Link>
      </View>
    </>
  );
}
