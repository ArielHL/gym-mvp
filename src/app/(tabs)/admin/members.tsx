import { useState } from "react";
import { View } from "react-native";
import { FilterChipRow } from "@/components/ui/FilterChipRow";
import {
  AdminAttendanceScreen,
  AdminSubscriptionsScreen,
} from "@/features/admin";

type MembersSection = "attendance" | "subscriptions";

export default function AdminMembersRoute() {
  const [section, setSection] = useState<MembersSection>("attendance");

  return (
    <View className="flex-1 bg-background">
      <View className="px-5 pt-3">
        <FilterChipRow
          label="Gestión"
          options={[
            { label: "Asistencia", value: "attendance" },
            { label: "Suscripciones", value: "subscriptions" },
          ]}
          selected={section}
          onSelect={setSection}
        />
      </View>
      {section === "attendance" ? <AdminAttendanceScreen /> : null}
      {section === "subscriptions" ? <AdminSubscriptionsScreen /> : null}
    </View>
  );
}
