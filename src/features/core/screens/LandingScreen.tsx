import { View, Text, Pressable, StatusBar, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RootStackParamList } from '@/types/navigation';

type Nav = NativeStackNavigationProp<RootStackParamList>;

export function LandingScreen() {
  const nav = useNavigation<Nav>();

  return (
    <SafeAreaView style={styles.root}>
      <StatusBar barStyle="light-content" backgroundColor="#000000" />

      <View style={styles.hero}>
        <Text style={styles.logoTop}>GYM</Text>
        <Text style={styles.logoBottom}>APP</Text>
        <Text style={styles.tagline}>Book classes. Train smarter.</Text>
      </View>

      <View style={styles.buttons}>
        <Pressable
          style={({ pressed }) => [styles.btnPrimary, pressed && styles.pressed]}
          onPress={() => nav.navigate('Auth')}
        >
          <Text style={styles.btnPrimaryText}>Sign In</Text>
        </Pressable>

        <Pressable
          style={({ pressed }) => [styles.btnSecondary, pressed && styles.pressed]}
          onPress={() => nav.navigate('Register')}
        >
          <Text style={styles.btnSecondaryText}>Create Account</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#000000',
  },
  hero: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
  },
  logoTop: {
    fontSize: 72,
    fontWeight: '900',
    color: '#ffffff',
    letterSpacing: 8,
  },
  logoBottom: {
    fontSize: 72,
    fontWeight: '900',
    color: '#22D3EE',
    letterSpacing: 8,
    marginTop: -12,
  },
  tagline: {
    marginTop: 24,
    fontSize: 16,
    color: '#555555',
    textAlign: 'center',
    letterSpacing: 1,
  },
  buttons: {
    paddingHorizontal: 32,
    paddingBottom: 48,
    gap: 12,
  },
  btnPrimary: {
    height: 54,
    backgroundColor: '#22D3EE',
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnPrimaryText: {
    color: '#000000',
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  btnSecondary: {
    height: 54,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#333333',
  },
  btnSecondaryText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
  pressed: {
    opacity: 0.7,
  },
});
