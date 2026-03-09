import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/constants/queryKeys';
import {
  bookClass,
  cancelBooking,
  fetchMyBookingsWithClasses,
  hasUserBookedClass
} from '../services/bookingsService';

export function useMyBookings() {
  return useQuery({ queryKey: queryKeys.bookings, queryFn: fetchMyBookingsWithClasses });
}

export function useBookedStatus(classId: string) {
  return useQuery({ queryKey: ['booked-status', classId], queryFn: () => hasUserBookedClass(classId) });
}

export function useBookClass() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (classId: string) => bookClass(classId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.bookings });
      queryClient.invalidateQueries({ queryKey: queryKeys.classes });
    }
  });
}

export function useCancelBooking() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (classId: string) => cancelBooking(classId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.bookings });
      queryClient.invalidateQueries({ queryKey: queryKeys.classes });
    }
  });
}
