import { useEffect, useMemo, useState } from "react";
import { ActivityIndicator, Alert, Pressable, Text, View } from "react-native";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Button } from "@/components/ui/Button";
import { FilterChipRow } from "@/components/ui/FilterChipRow";
import { Input } from "@/components/ui/Input";
import { Screen } from "@/components/ui/Screen";
import { queryKeys } from "@/constants/queryKeys";
import { useAuthState } from "@/features/auth/hooks/useAuthState";
import {
  type Location,
  createLocation,
  fetchLocations,
  setLocationActive,
  updateLocation,
} from "@/features/locations/services/locationsService";

const schema = z.object({
  name: z.string().min(2),
  description: z.string().optional(),
  address: z.string().optional(),
});

type FormValues = z.infer<typeof schema>;

const emptyValues: FormValues = {
  name: "",
  description: "",
  address: "",
};

function valuesFromLocation(location: Location): FormValues {
  return {
    name: location.name,
    description: location.description ?? "",
    address: location.address ?? "",
  };
}

export function AdminLocationsScreen() {
  const { role, initializing } = useAuthState();
  const queryClient = useQueryClient();
  const [selectedLocation, setSelectedLocation] = useState<Location | null>(
    null,
  );
  const [isFormVisible, setIsFormVisible] = useState(false);
  const [statusFilter, setStatusFilter] = useState<
    "all" | "active" | "inactive"
  >("active");
  const { control, handleSubmit, reset } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: emptyValues,
  });

  const locationsQuery = useQuery({
    queryKey: queryKeys.locations,
    queryFn: fetchLocations,
    enabled: role === "admin",
  });

  const filteredLocations = useMemo(() => {
    const items = locationsQuery.data ?? [];
    if (statusFilter === "all") {
      return items;
    }
    return items.filter(
      (location) => (statusFilter === "active") === location.is_active,
    );
  }, [locationsQuery.data, statusFilter]);

  useEffect(() => {
    if (selectedLocation) {
      reset(valuesFromLocation(selectedLocation));
    }
  }, [reset, selectedLocation]);

  const invalidateLocations = async () => {
    await queryClient.invalidateQueries({ queryKey: queryKeys.locations });
  };

  const saveMutation = useMutation({
    mutationFn: async (values: FormValues) => {
      const payload = {
        ...values,
        is_active: selectedLocation?.is_active ?? true,
      };

      if (selectedLocation) {
        return updateLocation(selectedLocation.id, payload);
      }

      return createLocation(payload);
    },
    onSuccess: async () => {
      await invalidateLocations();
      setSelectedLocation(null);
      setIsFormVisible(false);
      reset(emptyValues);
      Alert.alert("Saved", "Location saved.");
    },
    onError: (error) => {
      Alert.alert("Save failed", (error as Error).message);
    },
  });

  const activeMutation = useMutation({
    mutationFn: async ({
      location,
      isActive,
    }: {
      location: Location;
      isActive: boolean;
    }) => {
      await setLocationActive(location.id, isActive);
    },
    onSuccess: async (_, variables) => {
      await invalidateLocations();
      setSelectedLocation((current) =>
        current ? { ...current, is_active: variables.isActive } : current,
      );
      Alert.alert(
        variables.isActive ? "Reactivated" : "Deactivated",
        "Location status updated.",
      );
    },
    onError: (error) => {
      Alert.alert("Update failed", (error as Error).message);
    },
  });

  const startNewLocation = () => {
    setSelectedLocation(null);
    reset(emptyValues);
    setIsFormVisible(true);
  };

  const cancelForm = () => {
    setSelectedLocation(null);
    reset(emptyValues);
    setIsFormVisible(false);
  };

  const confirmToggleActive = (location: Location) => {
    const nextIsActive = !location.is_active;

    if (nextIsActive) {
      activeMutation.mutate({ location, isActive: true });
      return;
    }

    Alert.alert(
      "Deactivate location",
      "This keeps the location record but marks it inactive for admin management.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Deactivate",
          style: "destructive",
          onPress: () => activeMutation.mutate({ location, isActive: false }),
        },
      ],
    );
  };

  if (initializing || locationsQuery.isLoading) {
    return (
      <Screen scroll={false}>
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator color="#22D3EE" />
        </View>
      </Screen>
    );
  }

  if (role !== "admin") {
    return (
      <Screen scroll={false}>
        <View className="flex-1 items-center justify-center px-4">
          <Text className="text-center text-2xl font-bold text-white">
            Accesso de Administrador Requerido
          </Text>
          <Text className="mt-2 text-center text-sm text-gray-500">
            Solo los administradores pueden gestionar ubicaciones.
          </Text>
        </View>
      </Screen>
    );
  }

  return (
    <Screen>
      <View className="mb-5 mt-4 flex-row items-start justify-between gap-3">
        <View className="flex-1">
          <Text className="text-2xl font-bold text-white">
            Gestionar Ubicaciones
          </Text>
          <Text className="mt-1 text-sm text-gray-400">
            Agregar ubicaciones, actualizar detalles de las áreas del gimnasio y desactivar salas no utilizadas.
          </Text>
        </View>
        {!isFormVisible ? (
          <Pressable
            className="rounded-xl border border-border bg-surface px-4 py-3"
            onPress={startNewLocation}
          >
            <Text className="font-semibold text-white">Nuevo</Text>
          </Pressable>
        ) : null}
      </View>

      {!isFormVisible ? (
        <>
          <FilterChipRow
            label="Estado"
            options={[
              { label: "Todos", value: "all" },
              { label: "Activo", value: "active" },
              { label: "Inactivo", value: "inactive" },
            ]}
            selected={statusFilter}
            onSelect={setStatusFilter}
          />
          <View className="mb-6 rounded-2xl border border-border bg-surface p-4">
            <Text className="mb-3 text-base font-bold text-white">
              Ubicaciones ({filteredLocations.length})
            </Text>
            {locationsQuery.isError ? (
              <Text className="text-sm text-rose-400">
                No se pudieron cargar las ubicaciones.
              </Text>
            ) : filteredLocations.length ? (
              filteredLocations.map((location) => {
              const selected = selectedLocation?.id === location.id;
              return (
                <Pressable
                  key={location.id}
                  className={`mb-3 rounded-xl border p-3 ${selected ? "border-accent-cyan bg-cyan-950/30" : "border-border bg-background"}`}
                  onPress={() => {
                    setSelectedLocation(location);
                    setIsFormVisible(true);
                  }}
                >
                  <View className="flex-row items-start justify-between gap-3">
                    <View className="flex-1">
                      <Text className="font-bold text-white">
                        {location.name}
                      </Text>
                      <Text className="mt-1 text-xs text-gray-400">
                        {location.address || "No se proporcionó dirección"}
                      </Text>
                      {location.description ? (
                        <Text className="mt-2 text-sm text-gray-500">
                          {location.description}
                        </Text>
                      ) : null}
                    </View>
                    <Pressable
                      className={`rounded-full border px-3 py-2 ${location.is_active ? "border-cyan-400/60 bg-cyan-950/40" : "border-amber-400/60 bg-amber-950/30"}`}
                      disabled={activeMutation.isPending}
                      onPress={(event) => {
                        event.stopPropagation();
                        confirmToggleActive(location);
                      }}
                    >
                      <Text
                        className={`text-xs font-bold ${location.is_active ? "text-cyan-300" : "text-amber-300"}`}
                      >
                        {location.is_active ? "ACTIVO" : "INACTIVO"}
                      </Text>
                    </Pressable>
                  </View>
                </Pressable>
              );
            })
          ) : (
            <Text className="text-sm text-gray-400">
              {statusFilter !== "all"
                ? "No hay ubicaciones que coincidan con el filtro seleccionado."
                : "Aún no hay ubicaciones."}
            </Text>
          )}
          </View>
        </>
      ) : (
        <>
          <Text className="mb-3 text-lg font-bold text-white">
            {selectedLocation ? "Editar Ubicación" : "Crear Ubicación"}
          </Text>
          <Input
            control={control}
            name="name"
            label="Nombre"
            placeholder="Sala Principal"
            autoCapitalize="words"
          />
          <Input
            control={control}
            name="description"
            label="Descripción"
            placeholder="Sala de fuerza y acondicionamiento"
            autoCapitalize="sentences"
          />
          <Input
            control={control}
            name="address"
            label="Dirección"
            placeholder="123 Avenida Fitness"
            autoCapitalize="words"
          />
          <Button
            label={selectedLocation ? "Guardar Cambios" : "Crear Ubicación"}
            onPress={handleSubmit((values) => saveMutation.mutate(values))}
            loading={saveMutation.isPending}
          />
          <Button label="Cancelar" variant="secondary" onPress={cancelForm} />
        </>
      )}
    </Screen>
  );
}
