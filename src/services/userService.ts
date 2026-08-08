import type { User } from "@supabase/supabase-js";
import { apiGet, apiPost } from "@/services/api/client";

type ProfileRecord = {
  id: string;
  full_name: string | null;
  email: string | null;
  avatar_url: string | null;
  role: "admin" | "member";
};

export async function createUserProfileIfMissing(_user: User): Promise<void> {
  try {
    await apiPost<ProfileRecord | null>("/profiles/me/ensure");
  } catch (error) {
    // Profile creation is best-effort; auth state should still settle.
    console.warn("createUserProfileIfMissing:", (error as Error).message);
  }
}

export async function fetchUserProfile(
  userId: string,
): Promise<ProfileRecord | null> {
  const profile = await apiGet<ProfileRecord | null>("/me");
  return profile?.id === userId ? profile : null;
}
