import { supabase } from "@/services/supabase/client";
import type { GymClass } from "@/types/models";

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
  let query = supabase.from("classes_feed").select("*");

  if (date) {
    query = query.eq("date", date);
  }

  const { data, error } = await query
    .order("date", { ascending: true })
    .order("start_time", { ascending: true });

  if (error) {
    throw error;
  }

  return (data ?? []) as GymClass[];
}

export async function fetchClassById(classId: string): Promise<GymClass> {
  const { data, error } = await supabase
    .from("classes_feed")
    .select("*")
    .eq("id", classId)
    .single();

  if (error) {
    throw error;
  }

  return data as GymClass;
}

function normalizeTemplate(row: ClassTemplate): ClassTemplate {
  return {
    ...row,
    start_time: row.start_time.slice(0, 5),
  };
}

function upcomingSessionTimes(
  dayOfWeek: number,
  startTime: string,
  weeksAhead: number,
): string[] {
  const [hours, minutes] = startTime.split(":").map(Number);
  const now = new Date();
  const first = new Date(
    Date.UTC(
      now.getUTCFullYear(),
      now.getUTCMonth(),
      now.getUTCDate(),
      hours,
      minutes,
      0,
      0,
    ),
  );
  const daysUntilClass = (dayOfWeek - first.getUTCDay() + 7) % 7;
  first.setUTCDate(first.getUTCDate() + daysUntilClass);

  if (first <= now) {
    first.setUTCDate(first.getUTCDate() + 7);
  }

  return Array.from({ length: weeksAhead }, (_, index) => {
    const scheduledAt = new Date(first);
    scheduledAt.setUTCDate(first.getUTCDate() + index * 7);
    return scheduledAt.toISOString();
  });
}

export async function fetchClassTemplates(): Promise<ClassTemplate[]> {
  const { data, error } = await supabase
    .from("class_templates")
    .select("*")
    .order("is_active", { ascending: false })
    .order("day_of_week", { ascending: true })
    .order("start_time", { ascending: true });

  if (error) {
    throw error;
  }

  return ((data ?? []) as ClassTemplate[]).map(normalizeTemplate);
}

export async function generateUpcomingClassSessions(
  templateId: string,
  dayOfWeek: number,
  startTime: string,
  capacity: number,
  weeksAhead: number,
): Promise<void> {
  const scheduledTimes = upcomingSessionTimes(dayOfWeek, startTime, weeksAhead);
  const rows = scheduledTimes.map((scheduled_at) => ({
    template_id: templateId,
    scheduled_at,
    capacity,
    status: "scheduled",
  }));

  const { error } = await supabase.from("class_sessions").upsert(rows, {
    onConflict: "template_id,scheduled_at",
    ignoreDuplicates: true,
  });

  if (error) {
    throw error;
  }
}

async function updateFutureClassSessionCapacity(
  templateId: string,
  capacity: number,
): Promise<void> {
  const { error } = await supabase
    .from("class_sessions")
    .update({ capacity, updated_at: new Date().toISOString() })
    .eq("template_id", templateId)
    .eq("status", "scheduled")
    .gte("scheduled_at", new Date().toISOString());

  if (error) {
    throw error;
  }
}

export async function createClassTemplate(
  input: ClassTemplateInput,
  weeksAhead = 3,
): Promise<ClassTemplate> {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("You need to be logged in as admin.");
  }

  const { data, error } = await supabase
    .from("class_templates")
    .insert({
      title: input.title,
      description: input.description,
      trainer_name: input.trainer_name,
      exercise_type: input.exercise_type,
      duration_minutes: input.duration_minutes,
      day_of_week: input.day_of_week,
      start_time: input.start_time,
      capacity: input.capacity,
      difficulty_level: input.difficulty_level,
      location: input.location,
      valid_from: input.valid_from,
      valid_until: input.valid_until || null,
      created_by: user.id,
      is_active: input.is_active ?? true,
    })
    .select("*")
    .single();

  if (error) {
    throw error;
  }

  const template = normalizeTemplate(data as ClassTemplate);
  await generateUpcomingClassSessions(
    template.id,
    template.day_of_week,
    template.start_time,
    template.capacity,
    weeksAhead,
  );
  await updateFutureClassSessionCapacity(template.id, template.capacity);

  return template;
}

export async function updateClassTemplate(
  templateId: string,
  input: ClassTemplateInput,
  weeksAhead = 3,
): Promise<ClassTemplate> {
  const { data, error } = await supabase
    .from("class_templates")
    .update({
      title: input.title,
      description: input.description,
      trainer_name: input.trainer_name,
      exercise_type: input.exercise_type,
      duration_minutes: input.duration_minutes,
      day_of_week: input.day_of_week,
      start_time: input.start_time,
      capacity: input.capacity,
      difficulty_level: input.difficulty_level,
      location: input.location,
      valid_from: input.valid_from,
      valid_until: input.valid_until || null,
      is_active: input.is_active ?? true,
      updated_at: new Date().toISOString(),
    })
    .eq("id", templateId)
    .select("*")
    .single();

  if (error) {
    throw error;
  }

  const template = normalizeTemplate(data as ClassTemplate);
  await generateUpcomingClassSessions(
    template.id,
    template.day_of_week,
    template.start_time,
    template.capacity,
    weeksAhead,
  );
  await updateFutureClassSessionCapacity(template.id, template.capacity);

  return template;
}

export async function setClassTemplateActive(
  templateId: string,
  isActive: boolean,
): Promise<void> {
  const { error } = await supabase
    .from("class_templates")
    .update({ is_active: isActive, updated_at: new Date().toISOString() })
    .eq("id", templateId);

  if (error) {
    throw error;
  }
}
