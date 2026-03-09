import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { Alert, Text } from 'react-native';
import { Screen } from '@/components/ui/Screen';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { authService } from '@/features/auth/services/authService';

const registerSchema = z
  .object({
    email: z.string().email('Valid email required'),
    password: z.string().min(6, 'Password must be at least 6 chars'),
    confirmPassword: z.string()
  })
  .refine((values) => values.password === values.confirmPassword, {
    path: ['confirmPassword'],
    message: 'Passwords do not match'
  });

type RegisterValues = z.infer<typeof registerSchema>;

export function RegisterScreen() {
  const {
    control,
    handleSubmit,
    reset,
    formState: { isSubmitting }
  } = useForm<RegisterValues>({
    resolver: zodResolver(registerSchema),
    defaultValues: { email: '', password: '', confirmPassword: '' }
  });

  const onSubmit = async (values: RegisterValues) => {
    try {
      await authService.register(values.email, values.password);
      reset();
      Alert.alert('Account created', 'You can now access classes.');
    } catch (error) {
      Alert.alert('Registration failed', String((error as Error).message));
    }
  };

  return (
    <Screen>
      <Text className="mb-6 mt-8 text-3xl font-bold text-white">Create Account</Text>
      <Input control={control} name="email" label="Email" placeholder="you@example.com" />
      <Input control={control} name="password" label="Password" secureTextEntry />
      <Input control={control} name="confirmPassword" label="Confirm Password" secureTextEntry />
      <Button label="Register" onPress={handleSubmit(onSubmit)} loading={isSubmitting} />
    </Screen>
  );
}
