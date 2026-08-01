import { useQuery } from '@tanstack/react-query';
import { queryKeys } from '@/constants/queryKeys';
import { fetchClassById, fetchClassesByDate } from '../services/classesService';

export function useClass(classId?: string) {
  return useQuery({
    queryKey: queryKeys.classById(classId ?? ''),
    queryFn: () => fetchClassById(classId!),
    enabled: Boolean(classId)
  });
}

export function useClasses(date: string) {
  return useQuery({
    queryKey: queryKeys.classesByDate(date),
    queryFn: () => fetchClassesByDate(date)
  });
}
