import { apiGet, apiPatch } from "@/services/api/client";

export type AdminSettings = {
  cancellation_window_hours: number;
};

export async function fetchAdminSettings(): Promise<AdminSettings> {
  return apiGet<AdminSettings>("/admin/settings");
}

export async function updateCancellationWindow(
  hours: number,
): Promise<AdminSettings> {
  return apiPatch<AdminSettings>("/admin/settings", {
    cancellation_window_hours: hours,
  });
}