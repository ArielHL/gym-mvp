import { useEffect } from 'react';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { supabase } from '@/services/supabase/client';
import { env } from '@/lib/env';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false
  })
});

export function useNotifications() {
  useEffect(() => {
    const register = async () => {
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
    };

    register();
  }, []);
}
