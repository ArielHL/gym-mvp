import { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StatusBar,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { authService } from '@/features/auth/services/authService';

const KeyboardWrapper = Platform.OS === 'ios'
  ? ({ children }: { children: React.ReactNode }) => (
      <KeyboardAvoidingView className="flex-1" behavior="padding">{children}</KeyboardAvoidingView>
    )
  : ({ children }: { children: React.ReactNode }) => <View className="flex-1">{children}</View>;

export function CreateAccountScreen() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [loading, setLoading] = useState(false);

  const onSubmit = async () => {
    const trimmedName = name.trim();
    const trimmedEmail = email.trim();

    if (!trimmedName) {
      Alert.alert('Missing name', 'Please enter your full name.');
      return;
    }
    if (!trimmedEmail || !password || !confirm) {
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
      const { emailConfirmationRequired } = await authService.register(trimmedEmail, password, trimmedName);
      if (emailConfirmationRequired) {
        Alert.alert(
          'Check your email',
          `We sent a confirmation link to ${trimmedEmail}. Confirm your account, then come back to sign in.`,
          [{ text: 'OK', onPress: () => router.push('/auth') }]
        );
      }
    } catch (err) {
      Alert.alert('Registration failed', (err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-background">
      <StatusBar barStyle="light-content" backgroundColor="#0A0A0A" />
      <KeyboardWrapper>
        <ScrollView
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          contentContainerClassName="min-h-full justify-center px-7 py-10"
        >
          <View className="mb-8">
            <Text className="text-sm font-bold uppercase tracking-[3px] text-accent-purple">Join CaliFit</Text>
            <Text className="mt-3 text-4xl font-black text-white">Create Account</Text>
            <Text className="mt-2 text-base text-muted">Start booking classes in a few seconds.</Text>
          </View>

          <View className="gap-4 rounded-3xl border border-border bg-surface p-5">
            <View>
              <Text className="mb-2 text-sm font-semibold text-neutral-300">Full Name</Text>
              <TextInput
                className="h-14 rounded-2xl border border-border bg-black px-4 text-base text-white"
                value={name}
                onChangeText={setName}
                placeholder="Jane Smith"
                placeholderTextColor="#666666"
                autoCapitalize="words"
                autoComplete="name"
                autoCorrect={false}
                returnKeyType="next"
              />
            </View>

            <View>
              <Text className="mb-2 text-sm font-semibold text-neutral-300">Email</Text>
              <TextInput
                className="h-14 rounded-2xl border border-border bg-black px-4 text-base text-white"
                value={email}
                onChangeText={setEmail}
                placeholder="you@example.com"
                placeholderTextColor="#666666"
                autoCapitalize="none"
                autoComplete="email"
                keyboardType="email-address"
                autoCorrect={false}
                returnKeyType="next"
              />
            </View>

            <View>
              <Text className="mb-2 text-sm font-semibold text-neutral-300">Password</Text>
              <TextInput
                className="h-14 rounded-2xl border border-border bg-black px-4 text-base text-white"
                value={password}
                onChangeText={setPassword}
                placeholder="********"
                placeholderTextColor="#666666"
                secureTextEntry
                autoComplete="new-password"
                textContentType="newPassword"
                returnKeyType="next"
              />
            </View>

            <View>
              <Text className="mb-2 text-sm font-semibold text-neutral-300">Confirm Password</Text>
              <TextInput
                className="h-14 rounded-2xl border border-border bg-black px-4 text-base text-white"
                value={confirm}
                onChangeText={setConfirm}
                placeholder="********"
                placeholderTextColor="#666666"
                secureTextEntry
                autoComplete="new-password"
                textContentType="newPassword"
                returnKeyType="done"
                onSubmitEditing={onSubmit}
              />
            </View>

            <Pressable
              className={`mt-2 h-14 items-center justify-center rounded-2xl bg-accent-cyan ${loading ? 'opacity-60' : ''}`}
              onPress={onSubmit}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="#000000" />
              ) : (
                <Text className="text-base font-black text-black">Create Account</Text>
              )}
            </Pressable>
          </View>

          <Pressable className="mt-7 items-center" onPress={() => router.push('/auth')}>
            <Text className="text-sm text-muted">
              Already have an account? <Text className="font-bold text-accent-cyan">Sign In</Text>
            </Text>
          </Pressable>
        </ScrollView>
      </KeyboardWrapper>
    </SafeAreaView>
  );
}
