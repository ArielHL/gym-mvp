import type { User } from "@supabase/supabase-js";
import { apiGet, apiPatch, apiPost } from "@/services/api/client";

export type ProfileRecord = {
  id: string;
  full_name: string | null;
  email: string | null;
  avatar_url: string | null;
  role: "admin" | "member";
  address: string | null;
  doc_number: string | null;
};

export type UpdateProfileInput = {
  full_name?: string | null;
  avatar_url?: string | null;
  address?: string | null;
  doc_number?: string | null;
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

export async function updateMyProfile(
  input: UpdateProfileInput,
): Promise<ProfileRecord> {
  return apiPatch<ProfileRecord>("/me", input);
}
