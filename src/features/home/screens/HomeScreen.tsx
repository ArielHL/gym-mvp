import { Text, View } from 'react-native';
import { Screen } from '@/components/ui/Screen';
import { useAuthState } from '@/features/auth/hooks/useAuthState';
import { useNotifications } from '@/hooks/useNotifications';

export function HomeScreen() {
  const { user, displayName } = useAuthState();
  useNotifications();

  return (
    <Screen>
      <View className="mt-8 rounded-2xl bg-slate-900 p-5">
        <Text className="text-sm text-slate-400">Welcome</Text>
        <Text className="mt-2 text-2xl font-bold text-white">{displayName || user?.email || 'Athlete'}</Text>
        <Text className="mt-3 text-slate-300">Book your next class and keep your training streak alive.</Text>
      </View>
    </Screen>
  );
}
