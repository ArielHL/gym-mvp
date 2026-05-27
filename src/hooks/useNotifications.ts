import { useEffect } from 'react';
import { Platform } from 'react-native';
import { supabase } from '@/services/supabase/client';
import { env } from '@/lib/env';

export function useNotifications() {
  useEffect(() => {
    const register = async () => {
      try {
        const { default: Notifications } = await import('expo-notifications');

        Notifications.setNotificationHandler({
          handleNotification: async () => ({
            shouldShowAlert: true,
            shouldShowBanner: true,
            shouldShowList: true,
            shouldPlaySound: true,
            shouldSetBadge: false
          })
        });

        const permissions = await Notifications.requestPermissionsAsync();
        if (!permissions.granted) return;

        const token = await Notifications.getExpoPushTokenAsync({
          projectId: env.easProjectId || undefined
        });

        const {
          data: { user }
        } = await supabase.auth.getUser();

        const userId = user?.id;
        if (!userId) return;

        await supabase.from('notification_tokens').insert({
          user_id: userId,
          token: token.data,
          platform: Platform.OS
        });
      } catch (error) {
        console.warn('Push notification registration skipped:', error);
      }
    };

    register().catch((error) => {
      console.warn('Push notification setup failed:', error);
    });
  }, []);
}
