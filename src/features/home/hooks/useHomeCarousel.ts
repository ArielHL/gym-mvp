import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "@/constants/queryKeys";
import {
  type HomeCarouselSlide,
  fetchHomeCarousel,
  saveHomeCarousel,
} from "../services/homeContentService";

export function useHomeCarousel() {
  return useQuery({
    queryKey: queryKeys.homeCarousel,
    queryFn: fetchHomeCarousel,
  });
}

export function useSaveHomeCarousel() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: saveHomeCarousel,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: queryKeys.homeCarousel });
    },
  });
}