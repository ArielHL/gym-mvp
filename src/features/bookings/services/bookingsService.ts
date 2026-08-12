import { apiGet, apiPost } from "@/services/api/client";
import { supabase } from "@/services/supabase/client";
import type { Booking, CallableResponse, GymClass } from "@/types/models";

export type BookClassInput = {
  templateId: string;
  requestedDate: string;
  locationId: string;
};

type BookingFeedRow = {
  booking_id: string;
  user_id: string;
  class_id: string;
  location_id: string | null;
  booking_location: string | null;
  booking_location_address: string | null;
  booked_at: string;
  title: string;
  description: string;
  trainer_name: string;
  exercise_type: string;
  duration_minutes: number;
  day_of_week: number;
  date: string;
  start_time: string;
  end_time: string;
  capacity: number;
  available_spots: number;
  difficulty_level: "beginner" | "intermediate" | "advanced";
  location: string;
  valid_from: string;
  valid_until: string | null;
  created_at: string;
  updated_at: string;
};

function mapBookingFeedRow(row: BookingFeedRow): {
  booking: Booking;
  gymClass: GymClass;
} {
  return {
    booking: {
      id: row.booking_id,
      user_id: row.user_id,
      class_id: row.class_id,
      location_id: row.location_id,
      location_name: row.booking_location,
      location_address: row.booking_location_address,
      status: "booked",
      created_at: row.booked_at,
      updated_at: row.booked_at,
    },
    gymClass: {
      id: row.class_id,
      title: row.title,
      description: row.description,
      trainer_name: row.trainer_name,
      exercise_type: row.exercise_type,
      duration_minutes: row.duration_minutes,
      day_of_week: row.day_of_week,
      date: row.date,
      start_time: row.start_time,
      end_time: row.end_time,
      capacity: row.capacity,
      available_spots: row.available_spots,
      difficulty_level: row.difficulty_level,
      location: row.location,
      valid_from: row.valid_from,
      valid_until: row.valid_until,
      created_at: row.created_at,
      updated_at: row.updated_at,
    },
  };
}

export async function bookClass({
  templateId,
  requestedDate,
  locationId,
}: BookClassInput) {
  const payload = await apiPost<CallableResponse>("/bookings", {
    template_id: templateId,
    requested_date: requestedDate,
    location_id: locationId,
  });
  if (!payload.success) {
    throw new Error(payload.message || "Booking request failed.");
  }

  return payload;
}

export async function cancelBooking(classId: string) {
  const payload = await apiPost<CallableResponse>("/bookings/cancel", {
    session_id: classId,
  });
  if (!payload.success) {
    throw new Error(payload.message || "Cancellation request failed.");
  }

  return payload;
}

export async function fetchMyBookingsWithClasses(): Promise<
  Array<{ booking: Booking; gymClass: GymClass }>
> {
  const { data: sessionData } = await supabase.auth.getSession();
  if (!sessionData.session) {
    return [];
  }

  const data = await apiGet<BookingFeedRow[]>("/bookings/me");
  return data.map(mapBookingFeedRow);
}

export async function fetchAllBookingsWithClasses(): Promise<
  Array<{ booking: Booking; gymClass: GymClass }>
> {
  const { data: sessionData } = await supabase.auth.getSession();
  if (!sessionData.session) {
    return [];
  }

  const data = await apiGet<BookingFeedRow[]>("/admin/bookings");
  return data.map(mapBookingFeedRow);
}

export async function hasUserBookedClass(classId: string): Promise<boolean> {
  const { data: sessionData } = await supabase.auth.getSession();
  if (!sessionData.session) {
    return false;
  }

  const data = await apiGet<BookingFeedRow[]>("/bookings/me");
  return data.some((row) => row.class_id === classId);
}
