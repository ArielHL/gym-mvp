import { useState } from "react";
import { View } from "react-native";
import { FilterChipRow } from "@/components/ui/FilterChipRow";
import {
  AdminClassTypesScreen,
  AdminLocationsScreen,
  AdminTrainersScreen,
} from "@/features/admin";

type CatalogSection = "trainers" | "locations" | "types";

export default function AdminCatalogRoute() {
  const [section, setSection] = useState<CatalogSection>("trainers");

  return (
    <View className="flex-1 bg-background">
      <View className="px-5 pt-3">
        <FilterChipRow
          label="Recursos"
          options={[
            { label: "Entrenadores", value: "trainers" },
            { label: "Ubicaciones", value: "locations" },
            { label: "Tipos", value: "types" },
          ]}
          selected={section}
          onSelect={setSection}
        />
      </View>
      {section === "trainers" ? <AdminTrainersScreen /> : null}
      {section === "locations" ? <AdminLocationsScreen /> : null}
      {section === "types" ? <AdminClassTypesScreen /> : null}
    </View>
  );
}
