import { useState } from 'react';
import { Alert, View } from 'react-native';
import { Button } from '@/components/ui/Button';
import { authService } from '@/features/auth/services/authService';

interface SocialLoginButtonsProps {
  disabled?: boolean;
}

export function SocialLoginButtons({ disabled }: SocialLoginButtonsProps) {
  const [googleLoading, setGoogleLoading] = useState(false);

  const onGoogleSignIn = async () => {
    setGoogleLoading(true);
    try {
      await authService.loginWithGoogle();
    } catch (error) {
      Alert.alert('Google Login Failed', String((error as Error).message));
    } finally {
      setGoogleLoading(false);
    }
  };

  return (
    <View>
      <Button
        label="Continue with Google"
        onPress={onGoogleSignIn}
        disabled={disabled}
        loading={googleLoading}
        variant="secondary"
      />
    </View>
  );
}
