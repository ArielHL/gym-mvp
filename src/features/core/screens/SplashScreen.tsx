import { View } from 'react-native';
import { Screen } from '@/components/ui/Screen';

import { Text } from "@/components/ui/Text";
export function SplashScreen() {
  return (
    <Screen scroll={false}>
      <View className="flex-1 items-center justify-center">
        <Text className="text-3xl font-bold text-accent-cyan" variant="title">Gym Mobile</Text>
        <Text className="mt-3 text-muted">Train smarter, book faster.</Text>
      </View>
    </Screen>
  );
}
