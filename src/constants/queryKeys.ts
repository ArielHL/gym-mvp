export const queryKeys = {
  classes: ["classes"] as const,
  classesList: (date?: string) => ["classes", date ?? "all"] as const,
  classById: (classId: string) => ["classes", "detail", classId] as const,
  publicClassTemplates: ["classes", "templates", "public"] as const,
  publicClassTemplateById: (templateId: string) =>
    ["classes", "templates", "public", templateId] as const,
  classTemplates: ["admin", "class-templates"] as const,
  classTypes: ["admin", "class-types"] as const,
  activeClassTypes: ["class-types", "active"] as const,
  locations: ["admin", "locations"] as const,
  activeLocations: ["locations", "active"] as const,
  bookings: (userId?: string) => ["bookings", userId ?? "anonymous"] as const,
  allBookings: (userId?: string) =>
    ["bookings", "all", userId ?? "anonymous"] as const,
  subscriptions: ["subscriptions"] as const,
  adminUsers: ["admin", "users"] as const,
  adminSettings: ["admin", "settings"] as const,
  adminAttendance: ["admin", "attendance"] as const,
  me: ["me"] as const,
};
