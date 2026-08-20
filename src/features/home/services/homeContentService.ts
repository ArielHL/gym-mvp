import { apiGet, apiPatch } from "@/services/api/client";

export type HomeCarouselSlide = {
  id: string;
  title: string;
  sub: string;
  tag: string;
  tagColor: string;
  imageUri: string;
};

export type HomeCarousel = {
  slides: HomeCarouselSlide[];
};

export async function fetchHomeCarousel(): Promise<HomeCarousel> {
  return apiGet<HomeCarousel>("/content/home-carousel", { auth: false });
}

export async function saveHomeCarousel(
  slides: HomeCarouselSlide[],
): Promise<HomeCarousel> {
  return apiPatch<HomeCarousel>("/admin/content/home-carousel", { slides });
}