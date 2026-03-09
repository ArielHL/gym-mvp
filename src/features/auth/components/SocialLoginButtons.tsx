import { Alert, Platform, View } from 'react-native';
import * as Google from 'expo-auth-session/providers/google';
import * as Facebook from 'expo-auth-session/providers/facebook';
import * as AppleAuthentication from 'expo-apple-authentication';
import { makeRedirectUri } from 'expo-auth-session';
import { useEffect } from 'react';
import { Button } from '@/components/ui/Button';
import { authService } from '@/features/auth/services/authService';
import { env } from '@/lib/env';

export function SocialLoginButtons() {
  const [googleRequest, googleResponse, promptGoogle] = Google.useIdTokenAuthRequest({
    iosClientId: env.firebaseIosClientId,
    androidClientId: env.firebaseAndroidClientId,
    redirectUri: makeRedirectUri({ scheme: 'gymmobilemvp' })
  });

  const [facebookRequest, facebookResponse, promptFacebook] = Facebook.useAuthRequest({
    clientId: env.facebookAppId,
    redirectUri: makeRedirectUri({ scheme: 'gymmobilemvp' })
  });

  useEffect(() => {
    if (googleResponse?.type === 'success' && googleResponse.authentication?.idToken) {
      authService.loginWithGoogleIdToken(googleResponse.authentication.idToken).catch((error) => {
        Alert.alert('Google Login Failed', String(error?.message ?? error));
      });
    }
  }, [googleResponse]);

  useEffect(() => {
    if (facebookResponse?.type === 'success' && facebookResponse.authentication?.accessToken) {
      authService.loginWithFacebookToken(facebookResponse.authentication.accessToken).catch((error) => {
        Alert.alert('Facebook Login Failed', String(error?.message ?? error));
      });
    }
  }, [facebookResponse]);

  const onAppleSignIn = async () => {
    try {
      const credential = await AppleAuthentication.signInAsync({
        requestedScopes: [
          AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
          AppleAuthentication.AppleAuthenticationScope.EMAIL
        ]
      });

      if (!credential.identityToken) {
        throw new Error('Apple token missing');
      }

      await authService.loginWithAppleToken(credential.identityToken);
    } catch (error) {
      Alert.alert('Apple Login Failed', String((error as Error).message));
    }
  };

  return (
    <View>
      <Button label="Continue with Google" onPress={() => promptGoogle()} disabled={!googleRequest} variant="secondary" />
      <Button
        label="Continue with Facebook"
        onPress={() => promptFacebook()}
        disabled={!facebookRequest}
        variant="secondary"
      />
      {Platform.OS === 'ios' && (
        <Button label="Continue with Apple" onPress={onAppleSignIn} variant="secondary" />
      )}
    </View>
  );
}
