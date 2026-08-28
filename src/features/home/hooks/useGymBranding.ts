import { useQuery } from "@tanstack/react-query";
import { queryKeys } from "@/constants/queryKeys";
import {
  DEFAULT_GYM_NAME,
  fetchGymBranding,
} from "../services/gymBrandingService";

export function useGymBranding() {
  const query = useQuery({
    queryKey: queryKeys.gymBranding,
    queryFn: fetchGymBranding,
  });

  return {
    ...query,
    gymName: query.data?.name ?? DEFAULT_GYM_NAME,
  };
}
