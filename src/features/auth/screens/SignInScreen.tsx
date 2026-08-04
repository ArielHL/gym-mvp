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
import { SocialLoginButtons } from '@/features/auth/components/SocialLoginButtons';
import { authService } from '@/features/auth/services/authService';

const KeyboardWrapper = Platform.OS === 'ios'
  ? ({ children }: { children: React.ReactNode }) => (
      <KeyboardAvoidingView className="flex-1" behavior="padding">{children}</KeyboardAvoidingView>
    )
  : ({ children }: { children: React.ReactNode }) => <View className="flex-1">{children}</View>;

export function SignInScreen() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const onSubmit = async () => {
    const trimmedEmail = email.trim();
    if (!trimmedEmail || !password) {
      Alert.alert('Missing fields', 'Please enter email and password.');
      return;
    }

    setLoading(true);
    try {
      await authService.login(trimmedEmail, password);
    } catch (err) {
      Alert.alert('Login failed', (err as Error).message);
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
            <Text className="text-sm font-bold uppercase tracking-[3px] text-accent-cyan">CaliFit</Text>
            <Text className="mt-3 text-4xl font-black text-white">Sign In</Text>
            <Text className="mt-2 text-base text-muted">Welcome back. Book your next session.</Text>
          </View>

          <View className="gap-4 rounded-3xl border border-border bg-surface p-5">
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
                autoComplete="password"
                textContentType="password"
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
                <Text className="text-base font-black text-black">Sign In</Text>
              )}
            </Pressable>
          </View>

          <View className="my-6 flex-row items-center gap-3">
            <View className="h-px flex-1 bg-border" />
            <Text className="text-xs font-bold uppercase tracking-[2px] text-muted">or</Text>
            <View className="h-px flex-1 bg-border" />
          </View>

          <SocialLoginButtons disabled={loading} />

          <Pressable className="mt-7 items-center" onPress={() => router.push('/register')}>
            <Text className="text-sm text-muted">
              No account? <Text className="font-bold text-accent-cyan">Create one</Text>
            </Text>
          </Pressable>
        </ScrollView>
      </KeyboardWrapper>
    </SafeAreaView>
  );
}
