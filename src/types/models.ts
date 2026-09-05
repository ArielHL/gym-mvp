export type BookingStatus = "booked" | "cancelled";

export interface UserProfile {
  id: string;
  full_name: string;
  email: string;
  photo_url?: string | null;
  provider: string;
  membership_type: "basic" | "premium";
  created_at: string;
  updated_at: string;
}

export interface GymClass {
  id: string;
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
  image_url?: string;
  created_at: string;
  updated_at: string;
}

export interface Booking {
  id: string;
  user_id: string;
  class_id: string;
  location_id?: string | null;
  location_name?: string | null;
  location_address?: string | null;
  status: BookingStatus;
  created_at: string;
  updated_at: string;
}

export interface NotificationToken {
  id: string;
  user_id: string;
  token: string;
  platform: "ios" | "android" | "web";
  created_at: string;
}

export type AppNotificationType =
  | "booking_confirmed"
  | "booking_cancelled"
  | "general";

export interface AppNotification {
  id: string;
  user_id: string;
  type: AppNotificationType;
  title: string;
  body: string;
  data: Record<string, unknown>;
  read_at: string | null;
  created_at: string;
}

export interface CallableResponse<T = unknown> {
  success: boolean;
  message: string;
  data?: T;
}
