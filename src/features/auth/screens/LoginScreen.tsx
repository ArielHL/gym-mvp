import { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  Pressable,
  Alert,
  ActivityIndicator,
  StyleSheet,
  StatusBar,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';

// On Android, windowSoftInputMode=adjustResize already resizes the window for the
// keyboard — wrapping in KeyboardAvoidingView(height) causes a double-resize that
// pushes buttons off screen. Use a plain View instead.
const KeyboardWrapper = Platform.OS === 'ios'
  ? ({ children, style }: { children: React.ReactNode; style: object }) =>
      <KeyboardAvoidingView behavior="padding" style={style}>{children}</KeyboardAvoidingView>
  : ({ children, style }: { children: React.ReactNode; style: object }) =>
      <View style={style}>{children}</View>;
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RootStackParamList } from '@/types/navigation';
import { authService } from '@/features/auth/services/authService';

type Nav = NativeStackNavigationProp<RootStackParamList>;

export function LoginScreen() {
  const nav = useNavigation<Nav>();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const onLogin = async () => {
    if (!email.trim() || !password) {
      Alert.alert('Missing fields', 'Please enter email and password.');
      return;
    }
    setLoading(true);
    try {
      await authService.login(email.trim(), password);
      // Auth state drives navigation automatically � no navigate() needed
    } catch (err) {
      Alert.alert('Login failed', (err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.root}>
      <StatusBar barStyle="light-content" backgroundColor="#000000" />
      <KeyboardWrapper style={styles.flex}>
        <ScrollView
          contentContainerStyle={styles.inner}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <Text style={styles.title}>Sign In</Text>
          <Text style={styles.subtitle}>Welcome back</Text>

          <Text style={styles.label}>Email</Text>
          <TextInput
            style={styles.input}
            value={email}
            onChangeText={setEmail}
            placeholder="you@example.com"
            placeholderTextColor="#555555"
            autoCapitalize="none"
            keyboardType="email-address"
            autoCorrect={false}
          />

          <Text style={styles.label}>Password</Text>
          <TextInput
            style={styles.input}
            value={password}
            onChangeText={setPassword}
            placeholder="••••••••"
            placeholderTextColor="#555555"
            secureTextEntry
          />
        </ScrollView>

        {/* Sticky footer — always visible above the keyboard */}
        <View style={styles.footer}>
          <Pressable
            style={({ pressed }) => [styles.btn, (loading || pressed) && styles.btnPressed]}
            onPress={onLogin}
            disabled={loading}
          >
            {loading
              ? <ActivityIndicator color="#000000" />
              : <Text style={styles.btnText}>Sign In</Text>}
          </Pressable>

          <Pressable style={styles.link} onPress={() => nav.navigate('Register')}>
            <Text style={styles.linkText}>
              No account?{' '}
              <Text style={styles.linkHighlight}>Create one</Text>
            </Text>
          </Pressable>
        </View>
      </KeyboardWrapper>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#000000' },
  flex: { flex: 1 },
  inner: { paddingHorizontal: 28, paddingTop: 48, paddingBottom: 16 },
  title: { fontSize: 36, fontWeight: '900', color: '#ffffff' },
  subtitle: { fontSize: 16, color: '#555555', marginTop: 4, marginBottom: 32 },
  label: { fontSize: 13, color: '#888888', marginBottom: 6, marginTop: 16 },
  input: {
    height: 50,
    borderWidth: 1,
    borderColor: '#333333',
    borderRadius: 10,
    paddingHorizontal: 14,
    color: '#ffffff',
    backgroundColor: '#111111',
    fontSize: 15,
  },
  footer: {
    paddingHorizontal: 28,
    paddingTop: 12,
    paddingBottom: 24,
    backgroundColor: '#000000',
  },
  btn: {
    height: 54,
    backgroundColor: '#22D3EE',
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnPressed: { opacity: 0.6 },
  btnText: { color: '#000000', fontSize: 16, fontWeight: '700' },
  link: { marginTop: 20, alignItems: 'center' },
  linkText: { color: '#555555', fontSize: 14 },
  linkHighlight: { color: '#22D3EE', fontWeight: '600' },
});
