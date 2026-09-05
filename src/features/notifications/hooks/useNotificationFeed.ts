import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "@/constants/queryKeys";
import { useAuthState } from "@/features/auth/hooks/useAuthState";
import {
  fetchMyNotifications,
  markAllNotificationsRead,
  markNotificationRead,
} from "../services/notificationsService";

export function useNotificationFeed() {
  const { user } = useAuthState();
  const userId = user?.id;

  return useQuery({
    queryKey: queryKeys.notifications(userId),
    queryFn: fetchMyNotifications,
    enabled: Boolean(userId),
  });
}

export function useMarkNotificationRead() {
  const queryClient = useQueryClient();
  const { user } = useAuthState();
  const userId = user?.id;

  return useMutation({
    mutationFn: markNotificationRead,
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: queryKeys.notifications(userId),
      });
    },
  });
}

export function useMarkAllNotificationsRead() {
  const queryClient = useQueryClient();
  const { user } = useAuthState();
  const userId = user?.id;

  return useMutation({
    mutationFn: markAllNotificationsRead,
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: queryKeys.notifications(userId),
      });
    },
  });
}
