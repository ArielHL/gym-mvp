import { supabase } from '@/services/supabase/client';
import type { GymClass } from '@/types/models';

export async function fetchClassesByDate(date: string): Promise<GymClass[]> {
  const { data, error } = await supabase
    .from('classes_feed')
    .select('*')
    .eq('date', date)
    .order('start_time', { ascending: true });

  if (error) {
    throw error;
  }

  return (data ?? []) as GymClass[];
}

export async function fetchClassById(classId: string): Promise<GymClass> {
  const { data, error } = await supabase
    .from('classes_feed')
    .select('*')
    .eq('id', classId)
    .single();

  if (error) {
    throw error;
  }

  return data as GymClass;
}

type CreateTemplateInput = {
  title: string;
  description: string;
  trainer_name: string;
  exercise_type: string;
  duration_minutes: number;
  day_of_week: number;
  start_time: string;
  capacity: number;
  difficulty_level: 'beginner' | 'intermediate' | 'advanced';
  location: string;
};

export async function createClassTemplate(input: CreateTemplateInput): Promise<void> {
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error('You need to be logged in as admin.');
  }

  const { error } = await supabase.from('class_templates').insert({
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
    created_by: user.id,
    is_active: true
  });

  if (error) {
    throw error;
  }
}
