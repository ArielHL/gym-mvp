import { useEffect } from 'react';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { auth, db } from '@/services/firebase/client';
import { addDoc, collection, serverTimestamp } from 'firebase/firestore';
import { env } from '@/lib/env';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
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

      const userId = auth.currentUser?.uid;
      if (!userId) return;

      await addDoc(collection(db, 'notification_tokens'), {
        user_id: userId,
        token: token.data,
        platform: Platform.OS,
        created_at: serverTimestamp()
      });
    };

    register();
  }, []);
}
