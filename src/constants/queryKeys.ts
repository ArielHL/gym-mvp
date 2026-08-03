export const queryKeys = {
  classes: ['classes'] as const,
  classesList: (date?: string) => ['classes', date ?? 'all'] as const,
  classById: (classId: string) => ['classes', 'detail', classId] as const,
  bookings: ['bookings'] as const,
  me: ['me'] as const
};
