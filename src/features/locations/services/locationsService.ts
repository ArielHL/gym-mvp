import { apiGet, apiPatch, apiPost } from "@/services/api/client";
import type { CallableResponse } from "@/types/models";

export type Location = {
  id: string;
  name: string;
  description: string | null;
  address: string | null;
  is_active: boolean;
  created_by: string;
  created_at: string;
  updated_at: string;
};

export type LocationInput = {
  name: string;
  description?: string | null;
  address?: string | null;
  is_active?: boolean;
};

export async function fetchLocations(): Promise<Location[]> {
  return apiGet<Location[]>("/admin/locations");
}

export async function fetchActiveLocations(): Promise<Location[]> {
  return apiGet<Location[]>("/locations/active", { auth: false });
}

export async function createLocation(input: LocationInput): Promise<Location> {
  return apiPost<Location>("/admin/locations", {
    name: input.name,
    description: input.description || null,
    address: input.address || null,
    is_active: input.is_active ?? true,
  });
}

export async function updateLocation(
  locationId: string,
  input: LocationInput,
): Promise<Location> {
  return apiPatch<Location>(
    `/admin/locations/${encodeURIComponent(locationId)}`,
    {
      name: input.name,
      description: input.description || null,
      address: input.address || null,
      is_active: input.is_active ?? true,
    },
  );
}

export async function setLocationActive(
  locationId: string,
  isActive: boolean,
): Promise<void> {
  const payload = await apiPatch<CallableResponse>(
    `/admin/locations/${encodeURIComponent(locationId)}/active`,
    { is_active: isActive },
  );
  if (!payload.success) {
    throw new Error(payload.message || "Location status update failed.");
  }
}
