import { apiGet, apiPatch, apiPost } from "@/services/api/client";

export type AdminSubscription = {
  id: string;
  stripe_subscription_id: string;
  plan: string;
  status: string;
  current_period_end: string | null;
};

export type AdminUser = {
  id: string;
  full_name: string | null;
  email: string | null;
  role: string;
  created_at: string;
  attended_classes: number;
  subscription_id: string | null;
  stripe_subscription_id: string | null;
  plan: string | null;
  status: string | null;
  current_period_end: string | null;
};

export type AdminSubscriptionInput = {
  plan: string;
  status: string;
  stripe_subscription_id: string;
  current_period_end: string | null;
};

export function subscriptionFor(user: AdminUser): AdminSubscription | null {
  if (!user.subscription_id || !user.plan || !user.status) {
    return null;
  }
  return {
    id: user.subscription_id,
    stripe_subscription_id: user.stripe_subscription_id ?? "",
    plan: user.plan,
    status: user.status,
    current_period_end: user.current_period_end,
  };
}

export async function fetchAdminUsers(): Promise<AdminUser[]> {
  return apiGet<AdminUser[]>("/admin/users");
}

export async function createUserSubscription(
  userId: string,
  input: AdminSubscriptionInput,
): Promise<AdminSubscription> {
  return apiPost<AdminSubscription>(
    `/admin/users/${encodeURIComponent(userId)}/subscription`,
    input,
  );
}

export async function updateUserSubscription(
  userId: string,
  input: AdminSubscriptionInput,
): Promise<AdminSubscription> {
  return apiPatch<AdminSubscription>(
    `/admin/users/${encodeURIComponent(userId)}/subscription`,
    input,
  );
}