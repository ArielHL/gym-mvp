import type { User } from "@supabase/supabase-js";
import { supabase } from "@/services/supabase/client";

type ProfileRecord = {
  id: string;
  full_name: string | null;
  email: string | null;
  avatar_url: string | null;
  role: "admin" | "member";
};

export async function createUserProfileIfMissing(user: User): Promise<void> {
  const { error } = await supabase.from("profiles").insert({
    id: user.id,
    full_name: user.user_metadata?.full_name ?? user.email ?? null,
    email: user.email ?? null,
    avatar_url: user.user_metadata?.avatar_url ?? null,
  });

  if (error && error.code !== "23505") {
    // RLS will block this if the session is not yet confirmed — not fatal
    console.warn("createUserProfileIfMissing:", error.message);
  }
}

export async function fetchUserProfile(
  userId: string,
): Promise<ProfileRecord | null> {
  const { data, error } = await supabase
    .from("profiles")
    .select("id, full_name, email, avatar_url, role")
    .eq("id", userId)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return data;
}
