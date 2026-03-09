import { Text, View } from 'react-native';
import { Screen } from '@/components/ui/Screen';

export function SplashScreen() {
  return (
    <Screen scroll={false}>
      <View className="flex-1 items-center justify-center">
        <Text className="text-3xl font-bold text-cyan-400">Gym Mobile</Text>
        <Text className="mt-3 text-slate-300">Train smarter, book faster.</Text>
      </View>
    </Screen>
  );
}
