import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "@/constants/queryKeys";
import {
  type BookClassInput,
  bookClass,
  cancelBooking,
  fetchAllBookingsWithClasses,
  fetchMyBookingsWithClasses,
  hasUserBookedClass,
} from "../services/bookingsService";

export function useMyBookings() {
  return useQuery({
    queryKey: queryKeys.bookings,
    queryFn: fetchMyBookingsWithClasses,
  });
}

export function useAllBookings() {
  return useQuery({
    queryKey: queryKeys.allBookings,
    queryFn: fetchAllBookingsWithClasses,
  });
}

export function useBookedStatus(classId: string, enabled = true) {
  return useQuery({
    queryKey: ["booked-status", classId],
    queryFn: () => hasUserBookedClass(classId),
    enabled,
  });
}

export function useBookClass() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: BookClassInput) => bookClass(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.bookings });
      queryClient.invalidateQueries({ queryKey: queryKeys.allBookings });
      queryClient.invalidateQueries({ queryKey: queryKeys.classes });
    },
  });
}

export function useCancelBooking() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (classId: string) => cancelBooking(classId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.bookings });
      queryClient.invalidateQueries({ queryKey: queryKeys.allBookings });
      queryClient.invalidateQueries({ queryKey: queryKeys.classes });
    },
  });
}
