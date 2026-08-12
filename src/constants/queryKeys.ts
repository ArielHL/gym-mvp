export const queryKeys = {
  classes: ["classes"] as const,
  classesList: (date?: string) => ["classes", date ?? "all"] as const,
  classById: (classId: string) => ["classes", "detail", classId] as const,
  publicClassTemplates: ["classes", "templates", "public"] as const,
  publicClassTemplateById: (templateId: string) =>
    ["classes", "templates", "public", templateId] as const,
  classTemplates: ["admin", "class-templates"] as const,
  locations: ["admin", "locations"] as const,
  activeLocations: ["locations", "active"] as const,
  bookings: ["bookings"] as const,
  allBookings: ["bookings", "all"] as const,
  me: ["me"] as const,
};
