import { useState } from 'react';
import { View } from 'react-native';
import { showAlert } from '@/components/feedback/AppAlert';
import { Button } from '@/components/ui/Button';
import { authService } from '@/features/auth/services/authService';
import { GoogleIcon } from '@/features/auth/components/icons/GoogleIcon';

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
      showAlert('Google Login Failed', String((error as Error).message));
    } finally {
      setGoogleLoading(false);
    }
  };

  return (
    <View>
      <Button
        label="Continuar con Google"
        icon={<GoogleIcon size={20} />}
        onPress={onGoogleSignIn}
        disabled={disabled}
        loading={googleLoading}
        variant="secondary"
      />
    </View>
  );
}
