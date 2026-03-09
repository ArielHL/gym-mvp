import { Alert, Text, View } from 'react-native';
import { Screen } from '@/components/ui/Screen';
import { useAuthState } from '@/features/auth/hooks/useAuthState';
import { Button } from '@/components/ui/Button';
import { authService } from '@/features/auth/services/authService';

export function ProfileScreen() {
  const { user } = useAuthState();

  const onLogout = async () => {
    try {
      await authService.logout();
    } catch (error) {
      Alert.alert('Logout failed', String((error as Error).message));
    }
  };

  return (
    <Screen>
      <Text className="mb-4 mt-4 text-2xl font-bold text-white">Profile</Text>
      <View className="rounded-xl bg-slate-900 p-4">
        <Text className="text-slate-300">Name</Text>
        <Text className="text-lg text-white">{user?.displayName || '-'}</Text>
        <Text className="mt-2 text-slate-300">Email</Text>
        <Text className="text-lg text-white">{user?.email || '-'}</Text>
        <Text className="mt-2 text-slate-300">Provider</Text>
        <Text className="text-lg text-white">{user?.providerData?.[0]?.providerId || '-'}</Text>
      </View>
      <Button label="Logout" onPress={onLogout} variant="danger" />
    </Screen>
  );
}
