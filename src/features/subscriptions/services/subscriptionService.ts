import { apiGet } from "@/services/api/client";

export type Subscription = {
  id: string;
  user_id: string;
  stripe_subscription_id: string;
  plan: string;
  status: string;
  current_period_end: string | null;
  created_at: string;
  updated_at: string;
};

export async function fetchMySubscriptions(): Promise<Subscription[]> {
  return apiGet<Subscription[]>("/subscriptions/me");
}