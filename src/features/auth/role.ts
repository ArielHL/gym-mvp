export type UserRole = "super_admin" | "admin" | "member";

export function parseUserRole(role: string | null | undefined): UserRole {
  if (role === "super_admin" || role === "admin") {
    return role;
  }
  return "member";
}

export function hasAdminAccess(role: string | null | undefined): boolean {
  return role === "admin" || role === "super_admin";
}

export function isSuperAdmin(role: string | null | undefined): boolean {
  return role === "super_admin";
}
