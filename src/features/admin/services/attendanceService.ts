import { apiGet, apiPatch } from "@/services/api/client";
import type { CallableResponse } from "@/types/models";

export type AttendanceBooking = {
  booking_id: string;
  user_id: string;
  full_name: string | null;
  email: string | null;
  attended: boolean;
  title: string;
  date: string;
  start_time: string;
  end_time: string;
  location: string;
};

export async function fetchAttendanceBookings(): Promise<AttendanceBooking[]> {
  return apiGet<AttendanceBooking[]>("/admin/bookings");
}

export async function setBookingAttendance(
  bookingId: string,
  attended: boolean,
): Promise<void> {
  const payload = await apiPatch<CallableResponse>(
    `/admin/bookings/${encodeURIComponent(bookingId)}/attendance`,
    { attended },
  );
  if (!payload.success) {
    throw new Error(payload.message || "Attendance update failed.");
  }
}