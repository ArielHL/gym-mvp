import { useQuery } from '@tanstack/react-query';
import { queryKeys } from '@/constants/queryKeys';
import { fetchClassesByDate } from '../services/classesService';

export function useClasses(date: string) {
  return useQuery({
    queryKey: queryKeys.classesByDate(date),
    queryFn: () => fetchClassesByDate(date)
  });
}
