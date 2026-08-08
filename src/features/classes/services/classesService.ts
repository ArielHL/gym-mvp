import { apiGet, apiPatch, apiPost } from "@/services/api/client";
import type { CallableResponse, GymClass } from "@/types/models";

export type DifficultyLevel = "beginner" | "intermediate" | "advanced";

export type ClassTemplate = {
  id: string;
  title: string;
  description: string;
  trainer_name: string;
  exercise_type: string;
  duration_minutes: number;
  day_of_week: number;
  start_time: string;
  capacity: number;
  difficulty_level: DifficultyLevel;
  location: string;
  valid_from: string;
  valid_until: string | null;
  is_active: boolean;
  created_by: string;
  created_at: string;
  updated_at: string;
};

export type ClassTemplateInput = {
  title: string;
  description: string;
  trainer_name: string;
  exercise_type: string;
  duration_minutes: number;
  day_of_week: number;
  start_time: string;
  capacity: number;
  difficulty_level: DifficultyLevel;
  location: string;
  valid_from?: string;
  valid_until?: string | null;
  is_active?: boolean;
};

export async function fetchClasses(date?: string): Promise<GymClass[]> {
  const path = date ? `/classes?date=${encodeURIComponent(date)}` : "/classes";
  return apiGet<GymClass[]>(path, { auth: false });
}

export async function fetchClassById(classId: string): Promise<GymClass> {
  return apiGet<GymClass>(`/classes/${encodeURIComponent(classId)}`, {
    auth: false,
  });
}

function normalizeTemplate(row: ClassTemplate): ClassTemplate {
  return {
    ...row,
    start_time: row.start_time.slice(0, 5),
  };
}

export async function fetchClassTemplates(): Promise<ClassTemplate[]> {
  const data = await apiGet<ClassTemplate[]>("/admin/classes");
  return data.map(normalizeTemplate);
}

export async function createClassTemplate(
  input: ClassTemplateInput,
  weeksAhead = 3,
): Promise<ClassTemplate> {
  const data = await apiPost<ClassTemplate>("/admin/classes", {
    ...input,
    weeks_ahead: weeksAhead,
  });
  return normalizeTemplate(data);
}

export async function updateClassTemplate(
  templateId: string,
  input: ClassTemplateInput,
  weeksAhead = 3,
): Promise<ClassTemplate> {
  const data = await apiPatch<ClassTemplate>(
    `/admin/classes/${encodeURIComponent(templateId)}`,
    {
      ...input,
      weeks_ahead: weeksAhead,
    },
  );
  return normalizeTemplate(data);
}

export async function setClassTemplateActive(
  templateId: string,
  isActive: boolean,
  weeksAhead = 3,
): Promise<void> {
  const payload = await apiPatch<CallableResponse>(
    `/admin/classes/${encodeURIComponent(templateId)}/active`,
    {
      is_active: isActive,
      weeks_ahead: weeksAhead,
    },
  );
  if (!payload.success) {
    throw new Error(payload.message || "Class status update failed.");
  }
}
