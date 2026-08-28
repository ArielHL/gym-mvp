import { apiGet, apiPatch, apiPost } from "@/services/api/client";
import type { CallableResponse } from "@/types/models";

export type Trainer = {
  id: string;
  name: string;
  document: string;
  tel: string | null;
  email: string;
  address: string | null;
  is_active: boolean;
  created_by: string | null;
  created_at: string;
  updated_at: string;
};

export type TrainerInput = {
  name: string;
  document: string;
  tel?: string | null;
  email: string;
  address?: string | null;
  is_active?: boolean;
};

export async function fetchTrainers(): Promise<Trainer[]> {
  return apiGet<Trainer[]>("/admin/trainers");
}

export type ActiveTrainer = Pick<Trainer, "id" | "name" | "is_active">;

export async function fetchActiveTrainers(): Promise<ActiveTrainer[]> {
  return apiGet<ActiveTrainer[]>("/trainers/active", { auth: false });
}

export async function createTrainer(input: TrainerInput): Promise<Trainer> {
  return apiPost<Trainer>("/admin/trainers", {
    name: input.name,
    document: input.document,
    tel: input.tel || null,
    email: input.email,
    address: input.address || null,
    is_active: input.is_active ?? true,
  });
}

export async function updateTrainer(
  trainerId: string,
  input: TrainerInput,
): Promise<Trainer> {
  return apiPatch<Trainer>(`/admin/trainers/${encodeURIComponent(trainerId)}`, {
    name: input.name,
    document: input.document,
    tel: input.tel || null,
    email: input.email,
    address: input.address || null,
    is_active: input.is_active ?? true,
  });
}

export async function setTrainerActive(
  trainerId: string,
  isActive: boolean,
): Promise<void> {
  const payload = await apiPatch<CallableResponse>(
    `/admin/trainers/${encodeURIComponent(trainerId)}/active`,
    { is_active: isActive },
  );
  if (!payload.success) {
    throw new Error(payload.message || "Trainer status update failed.");
  }
}
