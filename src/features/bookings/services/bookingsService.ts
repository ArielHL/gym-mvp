import { env } from '@/lib/env';
import { supabase } from '@/services/supabase/client';
import type { Booking, CallableResponse, GymClass } from '@/types/models';

async function getBearerToken(): Promise<string> {
  const { data, error } = await supabase.auth.getSession();
  if (error || !data.session?.access_token) {
    throw error ?? new Error('No active session token found.');
  }

  return data.session.access_token;
}

export async function bookClass(classId: string) {
  const token = await getBearerToken();
  const response = await fetch(`${env.apiBaseUrl}/bookings`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`
    },
    body: JSON.stringify({ session_id: classId })
  });

  const payload = (await response.json()) as CallableResponse;
  if (!response.ok || !payload.success) {
    throw new Error(payload.message || 'Booking request failed.');
  }

  return payload;
}

export async function cancelBooking(classId: string) {
  const token = await getBearerToken();
  const response = await fetch(`${env.apiBaseUrl}/bookings/cancel`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`
    },
    body: JSON.stringify({ session_id: classId })
  });

  const payload = (await response.json()) as CallableResponse;
  if (!response.ok || !payload.success) {
    throw new Error(payload.message || 'Cancellation request failed.');
  }

  return payload;
}

export async function fetchMyBookingsWithClasses(): Promise<Array<{ booking: Booking; gymClass: GymClass }>> {
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) {
    return [];
  }

  const { data, error } = await supabase
    .from('bookings_feed')
    .select('*')
    .eq('user_id', user.id)
    .eq('status', 'confirmed')
    .order('date', { ascending: true })
    .order('start_time', { ascending: true });

  if (error) {
    throw error;
  }

  return (data ?? []).map((row) => ({
    booking: {
      id: row.booking_id,
      user_id: row.user_id,
      class_id: row.class_id,
      status: 'booked',
      created_at: row.booked_at,
      updated_at: row.booked_at
    },
    gymClass: {
      id: row.class_id,
      title: row.title,
      description: row.description,
      trainer_name: row.trainer_name,
      exercise_type: row.exercise_type,
      duration_minutes: row.duration_minutes,
      date: row.date,
      start_time: row.start_time,
      end_time: row.end_time,
      capacity: row.capacity,
      available_spots: row.available_spots,
      difficulty_level: row.difficulty_level,
      location: row.location,
      created_at: row.created_at,
      updated_at: row.updated_at
    }
  }));
}

export async function hasUserBookedClass(classId: string): Promise<boolean> {
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) {
    return false;
  }

  const { data, error } = await supabase
    .from('bookings')
    .select('id')
    .eq('user_id', user.id)
    .eq('session_id', classId)
    .eq('status', 'confirmed')
    .maybeSingle();

  if (error) {
    throw error;
  }

  return !!data;
}
