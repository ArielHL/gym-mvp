import { useState } from "react";
import { View } from "react-native";
import { FilterChipRow } from "@/components/ui/FilterChipRow";
import { AdminContentScreen, AdminSettingsScreen } from "@/features/admin";

type ConfigSection = "content" | "settings";

export default function AdminConfigRoute() {
  const [section, setSection] = useState<ConfigSection>("content");

  return (
    <View className="flex-1 bg-background">
      <View className="px-5 pt-3">
        <FilterChipRow
          label="Sección"
          options={[
            { label: "Contenido", value: "content" },
            { label: "Ajustes", value: "settings" },
          ]}
          selected={section}
          onSelect={setSection}
        />
      </View>
      {section === "content" ? <AdminContentScreen /> : null}
      {section === "settings" ? <AdminSettingsScreen /> : null}
    </View>
  );
}
