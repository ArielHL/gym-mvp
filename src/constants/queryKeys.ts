export const queryKeys = {
  classes: ["classes"] as const,
  classesList: (date?: string) => ["classes", date ?? "all"] as const,
  classById: (classId: string) => ["classes", "detail", classId] as const,
  classTemplates: ["admin", "class-templates"] as const,
  locations: ["admin", "locations"] as const,
  activeLocations: ["locations", "active"] as const,
  adminSettings: ["admin", "settings"] as const,
  bookings: ["bookings"] as const,
  me: ["me"] as const,
};
