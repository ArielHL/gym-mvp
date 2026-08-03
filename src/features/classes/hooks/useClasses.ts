import { useQuery } from '@tanstack/react-query';
import { queryKeys } from '@/constants/queryKeys';
import { fetchClassById, fetchClasses } from '../services/classesService';

export function useClass(classId?: string) {
  return useQuery({
    queryKey: queryKeys.classById(classId ?? ''),
    queryFn: () => fetchClassById(classId!),
    enabled: Boolean(classId),
  });
}

export function useClasses(date?: string, enabled = true) {
  return useQuery({
    queryKey: queryKeys.classesList(date),
    queryFn: () => fetchClasses(date),
    enabled,
  });
}
