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
import { MaterialCommunityIcons } from '@expo/vector-icons';

// On Android, windowSoftInputMode=adjustResize already resizes the window for the
// keyboard — wrapping in KeyboardAvoidingView(height) causes a double-resize that
// pushes buttons off screen. Use a plain View instead.
const KeyboardWrapper = Platform.OS === 'ios'
  ? ({ children, style }: { children: React.ReactNode; style: object }) =>
      <KeyboardAvoidingView behavior="padding" style={style}>{children}</KeyboardAvoidingView>
  : ({ children, style }: { children: React.ReactNode; style: object }) =>
      <View style={style}>{children}</View>;
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { authService } from '@/features/auth/services/authService';

export function LoginScreen() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const onLogin = async () => {
    if (!email.trim() || !password) {
      Alert.alert('Missing fields', 'Please enter email and password.');
      return;
    }
    setLoading(true);
    try {
      await authService.login(email.trim(), password);
      // Auth state drives navigation automatically; no navigate() needed.
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
          style={styles.flex}
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
            autoComplete="email"
            keyboardType="email-address"
            autoCorrect={false}
            returnKeyType="next"
          />

          <Text style={styles.label}>Password</Text>
          <View style={styles.inputWrap}>
            <TextInput
              style={styles.inputInner}
              value={password}
              onChangeText={setPassword}
              placeholder="********"
              placeholderTextColor="#555555"
              secureTextEntry={!showPassword}
              autoComplete="password"
              textContentType="password"
              returnKeyType="done"
              onSubmitEditing={onLogin}
            />
            <Pressable
              style={styles.eyeBtn}
              onPress={() => setShowPassword((prev) => !prev)}
              accessibilityLabel={showPassword ? 'Hide password' : 'Show password'}
              hitSlop={8}
            >
              <MaterialCommunityIcons
                name={showPassword ? 'eye-off' : 'eye'}
                size={20}
                color="#555555"
              />
            </Pressable>
          </View>
        </ScrollView>

        <SafeAreaView style={styles.footer} edges={['bottom']}>
          <Pressable
            style={({ pressed }) => [styles.btn, (loading || pressed) && styles.btnPressed]}
            onPress={onLogin}
            disabled={loading}
          >
            {loading
              ? <ActivityIndicator color="#000000" />
              : <Text style={styles.btnText}>Sign In</Text>}
          </Pressable>

          <Pressable style={styles.link} onPress={() => router.push('/register')}>
            <Text style={styles.linkText}>
              No account?{' '}
              <Text style={styles.linkHighlight}>Create one</Text>
            </Text>
          </Pressable>
        </SafeAreaView>
      </KeyboardWrapper>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#000000' },
  flex: { flex: 1 },
  inner: { flexGrow: 1, justifyContent: 'center', paddingHorizontal: 28, paddingTop: 32, paddingBottom: 24 },
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
  inputWrap: {
    height: 50,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#333333',
    borderRadius: 10,
    backgroundColor: '#111111',
  },
  inputInner: {
    flex: 1,
    height: 50,
    paddingHorizontal: 14,
    color: '#ffffff',
    fontSize: 15,
  },
  eyeBtn: { paddingHorizontal: 12, paddingVertical: 14 },
  footer: {
    borderTopWidth: 1,
    borderTopColor: '#1A1A1A',
    backgroundColor: '#000000',
    paddingHorizontal: 28,
    paddingTop: 16,
    paddingBottom: 12,
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
