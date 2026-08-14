import { apiDelete, apiGet, apiPatch, apiPost } from "@/services/api/client";
import type { CallableResponse } from "@/types/models";

export type ClassType = {
  id: string;
  nombre: string;
  slug: string;
  descripcion: string | null;
  is_active: boolean;
  sort_order: number;
  created_by?: string | null;
  created_at: string;
  updated_at: string;
};

export type ClassTypeInput = {
  nombre: string;
  slug: string;
  descripcion?: string | null;
  is_active?: boolean;
  sort_order?: number;
};

function normalizeClassTypeSlug(slug: string): string {
  return slug.trim().toLowerCase();
}

export async function fetchClassTypes(): Promise<ClassType[]> {
  return apiGet<ClassType[]>("/admin/tipos-clase");
}

export async function fetchActiveClassTypes(): Promise<ClassType[]> {
  return apiGet<ClassType[]>("/tipos-clase/active", { auth: false });
}

export async function createClassType(input: ClassTypeInput): Promise<ClassType> {
  return apiPost<ClassType>("/admin/tipos-clase", {
    nombre: input.nombre.trim(),
    slug: normalizeClassTypeSlug(input.slug),
    descripcion: input.descripcion || null,
    is_active: input.is_active ?? true,
    sort_order: input.sort_order ?? 0,
  });
}

export async function updateClassType(
  classTypeId: string,
  input: ClassTypeInput,
): Promise<ClassType> {
  return apiPatch<ClassType>(`/admin/tipos-clase/${encodeURIComponent(classTypeId)}`, {
    nombre: input.nombre.trim(),
    slug: normalizeClassTypeSlug(input.slug),
    descripcion: input.descripcion || null,
    is_active: input.is_active ?? true,
    sort_order: input.sort_order ?? 0,
  });
}

export async function setClassTypeActive(
  classTypeId: string,
  isActive: boolean,
): Promise<void> {
  const payload = await apiPatch<CallableResponse>(
    `/admin/tipos-clase/${encodeURIComponent(classTypeId)}/active`,
    { is_active: isActive },
  );
  if (!payload.success) {
    throw new Error(payload.message || "No se pudo actualizar el estado del tipo.");
  }
}

export async function deleteClassType(classTypeId: string): Promise<void> {
  const payload = await apiDelete<CallableResponse>(
    `/admin/tipos-clase/${encodeURIComponent(classTypeId)}`,
  );
  if (!payload.success) {
    throw new Error(payload.message || "No se pudo eliminar el tipo de clase.");
  }
}
