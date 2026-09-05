import { apiGet, apiPatch } from "@/services/api/client";
import type { AppNotification, CallableResponse } from "@/types/models";

export async function fetchMyNotifications(): Promise<AppNotification[]> {
  return apiGet<AppNotification[]>("/notifications/me");
}

export async function markNotificationRead(notificationId: string): Promise<void> {
  const payload = await apiPatch<CallableResponse>(
    `/notifications/${encodeURIComponent(notificationId)}/read`,
  );
  if (!payload.success) {
    throw new Error(payload.message || "Notification update failed.");
  }
}

export async function markAllNotificationsRead(): Promise<void> {
  const payload = await apiPatch<CallableResponse>("/notifications/read-all");
  if (!payload.success) {
    throw new Error(payload.message || "Notification update failed.");
  }
}
