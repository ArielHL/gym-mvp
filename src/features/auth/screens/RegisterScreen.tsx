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

const KeyboardWrapper = Platform.OS === 'ios'
  ? ({ children, style }: { children: React.ReactNode; style: object }) =>
      <KeyboardAvoidingView behavior="padding" style={style}>{children}</KeyboardAvoidingView>
  : ({ children, style }: { children: React.ReactNode; style: object }) =>
      <View style={style}>{children}</View>;
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { authService } from '@/features/auth/services/authService';

export function RegisterScreen() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [loading, setLoading] = useState(false);

  const onRegister = async () => {
    if (!name.trim()) {
      Alert.alert('Missing name', 'Please enter your full name.');
      return;
    }
    if (!email.trim() || !password || !confirm) {
      Alert.alert('Missing fields', 'Please fill all fields.');
      return;
    }
    if (password !== confirm) {
      Alert.alert('Password mismatch', 'Passwords do not match.');
      return;
    }
    if (password.length < 6) {
      Alert.alert('Weak password', 'Password must be at least 6 characters.');
      return;
    }
    setLoading(true);
    try {
      const { emailConfirmationRequired } = await authService.register(email.trim(), password, name.trim());
      if (emailConfirmationRequired) {
        Alert.alert(
          'Check your email ✉️',
          `We sent a confirmation link to ${email.trim()}. Click it to activate your account, then come back to sign in.`,
          [{ text: 'OK', onPress: () => router.push('/auth') }]
        );
      } else {
        // Email confirmation disabled — user is logged in immediately, nav driven by auth state
      }
    } catch (err) {
      Alert.alert('Registration failed', (err as Error).message);
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
          <Text style={styles.title}>Create Account</Text>
          <Text style={styles.subtitle}>Join today</Text>

          <Text style={styles.label}>Full Name</Text>
          <TextInput
            style={styles.input}
            value={name}
            onChangeText={setName}
            placeholder="Jane Smith"
            placeholderTextColor="#555555"
              autoCapitalize="words"
              autoComplete="name"
              autoCorrect={false}
              returnKeyType="next"
            />

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
          <TextInput
            style={styles.input}
            value={password}
            onChangeText={setPassword}
            placeholder="********"
            placeholderTextColor="#555555"
            secureTextEntry
            autoComplete="new-password"
            textContentType="newPassword"
            returnKeyType="next"
          />

          <Text style={styles.label}>Confirm Password</Text>
          <TextInput
            style={styles.input}
            value={confirm}
            onChangeText={setConfirm}
            placeholder="********"
            placeholderTextColor="#555555"
            secureTextEntry
            autoComplete="new-password"
            textContentType="newPassword"
            returnKeyType="done"
            onSubmitEditing={onRegister}
          />
        </ScrollView>

        <SafeAreaView style={styles.footer} edges={['bottom']}>
          <Pressable
            style={({ pressed }) => [styles.btn, (loading || pressed) && styles.btnPressed]}
            onPress={onRegister}
            disabled={loading}
          >
            {loading
              ? <ActivityIndicator color="#000000" />
              : <Text style={styles.btnText}>Register</Text>}
          </Pressable>

          <Pressable style={styles.link} onPress={() => router.push('/auth')}>
            <Text style={styles.linkText}>
              Already have an account?{' '}
              <Text style={styles.linkHighlight}>Sign In</Text>
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
  inner: { flexGrow: 1, paddingHorizontal: 28, paddingTop: 32, paddingBottom: 24 },
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
  btn: {
    height: 54,
    backgroundColor: '#22D3EE',
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnPressed: { opacity: 0.6 },
  btnText: { color: '#000000', fontSize: 16, fontWeight: '700' },
  footer: {
    borderTopWidth: 1,
    borderTopColor: '#1A1A1A',
    backgroundColor: '#000000',
    paddingHorizontal: 28,
    paddingTop: 16,
    paddingBottom: 12,
  },
  link: { marginTop: 24, alignItems: 'center' },
  linkText: { color: '#555555', fontSize: 14 },
  linkHighlight: { color: '#22D3EE', fontWeight: '600' },
});
