import { supabase } from "@/services/supabase/client";

export const DEFAULT_WEEKS_AHEAD_TO_GENERATE = 3;
export const MIN_WEEKS_AHEAD_TO_GENERATE = 1;
export const MAX_WEEKS_AHEAD_TO_GENERATE = 12;

const WEEKS_AHEAD_KEY = "weeks_ahead_to_generate";

function normalizeWeeks(value: unknown): number {
  const parsed = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(parsed)) {
    return DEFAULT_WEEKS_AHEAD_TO_GENERATE;
  }

  return Math.min(
    MAX_WEEKS_AHEAD_TO_GENERATE,
    Math.max(MIN_WEEKS_AHEAD_TO_GENERATE, Math.trunc(parsed)),
  );
}

export async function fetchWeeksAheadToGenerate(): Promise<number> {
  const { data, error } = await supabase
    .from("admin_settings")
    .select("value")
    .eq("key", WEEKS_AHEAD_KEY)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return normalizeWeeks(data?.value ?? DEFAULT_WEEKS_AHEAD_TO_GENERATE);
}

export async function updateWeeksAheadToGenerate(
  weeksAhead: number,
): Promise<number> {
  const weeks = normalizeWeeks(weeksAhead);
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("You need to be logged in as admin.");
  }

  const { error } = await supabase.from("admin_settings").upsert({
    key: WEEKS_AHEAD_KEY,
    value: weeks,
    updated_by: user.id,
    updated_at: new Date().toISOString(),
  });

  if (error) {
    throw error;
  }

  return weeks;
}
