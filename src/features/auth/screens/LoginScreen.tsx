import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { Alert, Text, View } from 'react-native';
import { type NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '@/types/navigation';
import { Screen } from '@/components/ui/Screen';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { SocialLoginButtons } from '@/features/auth/components/SocialLoginButtons';
import { authService } from '@/features/auth/services/authService';

const loginSchema = z.object({
  email: z.string().email('Valid email required'),
  password: z.string().min(6, 'Password must be at least 6 characters')
});

type LoginValues = z.infer<typeof loginSchema>;
type Props = NativeStackScreenProps<RootStackParamList, 'Auth'>;

export function LoginScreen({ navigation }: Props) {
  const {
    control,
    handleSubmit,
    formState: { isSubmitting }
  } = useForm<LoginValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: '', password: '' }
  });

  const onSubmit = async (values: LoginValues) => {
    try {
      await authService.login(values.email, values.password);
      navigation.replace('Main');
    } catch (error) {
      Alert.alert('Login failed', String((error as Error).message));
    }
  };

  return (
    <Screen>
      <Text className="mt-8 text-3xl font-bold text-white">Welcome Back</Text>
      <Text className="mb-6 mt-2 text-slate-400">Sign in to manage your classes</Text>

      <Input control={control} name="email" label="Email" placeholder="you@example.com" />
      <Input control={control} name="password" label="Password" secureTextEntry placeholder="••••••••" />

      <Button label="Login" onPress={handleSubmit(onSubmit)} loading={isSubmitting} />
      <SocialLoginButtons />

      <View className="mt-6 flex-row justify-center">
        <Text className="text-slate-300">No account yet? </Text>
        <Text className="font-semibold text-cyan-300" onPress={() => navigation.navigate('Register')}>
          Register
        </Text>
      </View>
    </Screen>
  );
}
