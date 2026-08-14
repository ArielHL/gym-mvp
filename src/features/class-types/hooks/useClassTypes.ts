import { useQuery } from "@tanstack/react-query";
import { queryKeys } from "@/constants/queryKeys";
import { fetchActiveClassTypes, fetchClassTypes } from "../services/classTypesService";

export function useClassTypes(enabled = true) {
  return useQuery({
    queryKey: queryKeys.classTypes,
    queryFn: fetchClassTypes,
    enabled,
  });
}

export function useActiveClassTypes(enabled = true) {
  return useQuery({
    queryKey: queryKeys.activeClassTypes,
    queryFn: fetchActiveClassTypes,
    enabled,
  });
}
