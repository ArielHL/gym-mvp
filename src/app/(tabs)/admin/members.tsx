import { useState } from "react";
import { View } from "react-native";
import { FilterChipRow } from "@/components/ui/FilterChipRow";
import {
  AdminAttendanceScreen,
  AdminRolesScreen,
  AdminSubscriptionsScreen,
} from "@/features/admin";
import { useAuthState } from "@/features/auth/hooks/useAuthState";
import { isSuperAdmin } from "@/features/auth/role";

type MembersSection = "attendance" | "subscriptions" | "roles";

export default function AdminMembersRoute() {
  const { role } = useAuthState();
  const canManageRoles = isSuperAdmin(role);
  const [section, setSection] = useState<MembersSection>("attendance");
  const activeSection =
    section === "roles" && !canManageRoles ? "attendance" : section;

  return (
    <View className="flex-1 bg-background">
      <View className="px-5 pt-3">
        <FilterChipRow
          label="Gestión"
          options={[
            { label: "Asistencia", value: "attendance" as const },
            { label: "Suscripciones", value: "subscriptions" as const },
            ...(canManageRoles
              ? [{ label: "Roles", value: "roles" as const }]
              : []),
          ]}
          selected={activeSection}
          onSelect={setSection}
        />
      </View>
      {activeSection === "attendance" ? <AdminAttendanceScreen /> : null}
      {activeSection === "subscriptions" ? <AdminSubscriptionsScreen /> : null}
      {activeSection === "roles" ? <AdminRolesScreen /> : null}
    </View>
  );
}
