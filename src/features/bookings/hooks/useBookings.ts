import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "@/constants/queryKeys";
import { useAuthState } from "@/features/auth/hooks/useAuthState";
import {
  type BookClassInput,
  bookClass,
  cancelBooking,
  fetchAllBookingsWithClasses,
  fetchMyBookingsWithClasses,
  hasUserBookedClass,
} from "../services/bookingsService";

export function useMyBookings() {
  const { user } = useAuthState();
  const userId = user?.id;
  return useQuery({
    queryKey: queryKeys.bookings(userId),
    queryFn: fetchMyBookingsWithClasses,
    enabled: Boolean(userId),
  });
}

export function useAllBookings() {
  const { user } = useAuthState();
  const userId = user?.id;
  return useQuery({
    queryKey: queryKeys.allBookings(userId),
    queryFn: fetchAllBookingsWithClasses,
    enabled: Boolean(userId),
  });
}

export function useBookedStatus(classId: string, enabled = true) {
  const { user } = useAuthState();
  const userId = user?.id;
  return useQuery({
    queryKey: ["booked-status", userId ?? "anonymous", classId],
    queryFn: () => hasUserBookedClass(classId),
    enabled: enabled && Boolean(userId),
  });
}

export function useBookClass() {
  const queryClient = useQueryClient();
  const { user } = useAuthState();
  const userId = user?.id;
  return useMutation({
    mutationFn: (input: BookClassInput) => bookClass(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.bookings(userId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.allBookings(userId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.classes });
      queryClient.invalidateQueries({ queryKey: queryKeys.notifications(userId) });
    },
  });
}

export function useCancelBooking() {
  const queryClient = useQueryClient();
  const { user } = useAuthState();
  const userId = user?.id;
  return useMutation({
    mutationFn: (classId: string) => cancelBooking(classId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.bookings(userId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.allBookings(userId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.classes });
      queryClient.invalidateQueries({ queryKey: queryKeys.notifications(userId) });
    },
  });
}
