import { apiGet, apiPatch } from "@/services/api/client";

export const DEFAULT_GYM_NAME = "Flowly";

export type GymBranding = {
  name: string;
};

export function normalizeGymName(name?: string | null): string {
  const trimmed = name?.trim() ?? "";
  return trimmed || DEFAULT_GYM_NAME;
}

export async function fetchGymBranding(): Promise<GymBranding> {
  const data = await apiGet<Partial<GymBranding>>("/content/gym-branding", {
    auth: false,
  });
  return { name: normalizeGymName(data.name) };
}

export async function saveGymBranding(input: GymBranding): Promise<GymBranding> {
  return apiPatch<GymBranding>("/admin/content/gym-branding", {
    name: normalizeGymName(input.name),
  });
}
