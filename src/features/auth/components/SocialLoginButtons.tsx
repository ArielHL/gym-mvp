import { Alert, Platform, View } from 'react-native';
import { Button } from '@/components/ui/Button';
import { authService } from '@/features/auth/services/authService';

export function SocialLoginButtons() {
  const onGoogleSignIn = async () => {
    try {
      await authService.loginWithGoogle();
    } catch (error) {
      Alert.alert('Google Login Failed', String((error as Error).message));
    }
  };

  const onFacebookSignIn = async () => {
    try {
      await authService.loginWithFacebook();
    } catch (error) {
      Alert.alert('Facebook Login Failed', String((error as Error).message));
    }
  };

  const onAppleSignIn = async () => {
    try {
      await authService.loginWithApple();
    } catch (error) {
      Alert.alert('Apple Login Failed', String((error as Error).message));
    }
  };

  return (
    <View>
      <Button label="Continue with Google" onPress={onGoogleSignIn} variant="secondary" />
      <Button
        label="Continue with Facebook"
        onPress={onFacebookSignIn}
        variant="secondary"
      />
      {Platform.OS === 'ios' && (
        <Button label="Continue with Apple" onPress={onAppleSignIn} variant="secondary" />
      )}
    </View>
  );
}
