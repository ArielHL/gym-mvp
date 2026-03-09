export const queryKeys = {
  classes: ['classes'] as const,
  classesByDate: (date: string) => ['classes', date] as const,
  bookings: ['bookings'] as const,
  me: ['me'] as const
};
