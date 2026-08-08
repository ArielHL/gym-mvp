import { apiGet, apiPatch } from "@/services/api/client";

export const DEFAULT_WEEKS_AHEAD_TO_GENERATE = 3;
export const MIN_WEEKS_AHEAD_TO_GENERATE = 1;
export const MAX_WEEKS_AHEAD_TO_GENERATE = 12;

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
  const weeks = await apiGet<number>("/admin/settings/weeks-ahead");
  return normalizeWeeks(weeks);
}

export async function updateWeeksAheadToGenerate(
  weeksAhead: number,
): Promise<number> {
  const weeks = normalizeWeeks(weeksAhead);
  const updatedWeeks = await apiPatch<number>("/admin/settings/weeks-ahead", {
    weeks_ahead: weeks,
  });
  return normalizeWeeks(updatedWeeks);
}
