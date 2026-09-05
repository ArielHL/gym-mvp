import { useEffect, useMemo, useState } from "react";
import { ActivityIndicator, Alert, Pressable, View } from "react-native";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Button } from "@/components/ui/Button";
import { FilterChipRow } from "@/components/ui/FilterChipRow";
import { Input } from "@/components/ui/Input";
import { Screen } from "@/components/ui/Screen";
import { queryKeys } from "@/constants/queryKeys";
import { useAuthState } from "@/features/auth/hooks/useAuthState";
import { useClassTypes } from "@/features/class-types/hooks/useClassTypes";
import {
  type ClassType,
  createClassType,
  deleteClassType,
  setClassTypeActive,
  updateClassType,
} from "@/features/class-types/services/classTypesService";

import { colors } from "@/theme";
import { Text } from "@/components/ui/Text";
const schema = z.object({
  nombre: z.string().min(2, "Minimo 2 caracteres"),
  slug: z
    .string()
    .min(2, "Minimo 2 caracteres")
    .regex(/^[a-z0-9-]+$/, "Solo minusculas, numeros y guion"),
  descripcion: z.string().optional(),
  sort_order: z.coerce.number().int().min(0),
  image_url: z.string().optional(),
});

type FormValues = z.infer<typeof schema>;

const emptyValues: FormValues = {
  nombre: "",
  slug: "",
  descripcion: "",
  sort_order: 0,
  image_url: "",
};

function valuesFromType(tipo: ClassType): FormValues {
  return {
    nombre: tipo.nombre,
    slug: tipo.slug,
    descripcion: tipo.descripcion ?? "",
    sort_order: tipo.sort_order,
    image_url: tipo.image_url ?? "",
  };
}

export function AdminClassTypesScreen() {
  const { role, initializing } = useAuthState();
  const queryClient = useQueryClient();
  const [selectedType, setSelectedType] = useState<ClassType | null>(null);
  const [isFormVisible, setIsFormVisible] = useState(false);
  const [statusFilter, setStatusFilter] = useState<
    "all" | "active" | "inactive"
  >("active");
  const { control, handleSubmit, reset } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: emptyValues,
  });

  const classTypesQuery = useClassTypes(role === "admin");

  const filteredTypes = useMemo(() => {
    const items = classTypesQuery.data ?? [];
    if (statusFilter === "all") {
      return items;
    }
    return items.filter(
      (tipo) => (statusFilter === "active") === tipo.is_active,
    );
  }, [classTypesQuery.data, statusFilter]);

  useEffect(() => {
    if (selectedType) {
      reset(valuesFromType(selectedType));
    }
  }, [reset, selectedType]);

  const invalidateClassTypes = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: queryKeys.classTypes }),
      queryClient.invalidateQueries({ queryKey: queryKeys.activeClassTypes }),
      queryClient.invalidateQueries({ queryKey: queryKeys.classTemplates }),
      queryClient.invalidateQueries({ queryKey: queryKeys.publicClassTemplates }),
    ]);
  };

  const saveMutation = useMutation({
    mutationFn: async (values: FormValues) => {
      const payload = {
        ...values,
        slug: values.slug.trim().toLowerCase(),
        is_active: selectedType?.is_active ?? true,
      };

      if (selectedType) {
        return updateClassType(selectedType.id, payload);
      }

      return createClassType(payload);
    },
    onSuccess: async () => {
      await invalidateClassTypes();
      setSelectedType(null);
      setIsFormVisible(false);
      reset(emptyValues);
      Alert.alert("Guardado", "Tipo de clase guardado.");
    },
    onError: (error) => {
      Alert.alert("Error al guardar", (error as Error).message);
    },
  });

  const activeMutation = useMutation({
    mutationFn: async ({ tipo, isActive }: { tipo: ClassType; isActive: boolean }) => {
      await setClassTypeActive(tipo.id, isActive);
    },
    onSuccess: async (_, variables) => {
      await invalidateClassTypes();
      setSelectedType((current) =>
        current ? { ...current, is_active: variables.isActive } : current,
      );
      Alert.alert(
        variables.isActive ? "Reactivado" : "Desactivado",
        "Estado del tipo actualizado.",
      );
    },
    onError: (error) => {
      Alert.alert("Error", (error as Error).message);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (tipo: ClassType) => {
      await deleteClassType(tipo.id);
    },
    onSuccess: async () => {
      await invalidateClassTypes();
      setSelectedType(null);
      setIsFormVisible(false);
      reset(emptyValues);
      Alert.alert("Eliminado", "Tipo de clase eliminado.");
    },
    onError: (error) => {
      Alert.alert("No se pudo eliminar", (error as Error).message);
    },
  });

  const startNewType = () => {
    setSelectedType(null);
    reset(emptyValues);
    setIsFormVisible(true);
  };

  const cancelForm = () => {
    setSelectedType(null);
    reset(emptyValues);
    setIsFormVisible(false);
  };

  const confirmToggleActive = (tipo: ClassType) => {
    const nextIsActive = !tipo.is_active;
    activeMutation.mutate({ tipo, isActive: nextIsActive });
  };

  const confirmDelete = (tipo: ClassType) => {
    Alert.alert(
      "Eliminar tipo",
      `Se eliminara ${tipo.nombre} solo si no esta en uso.`,
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Eliminar",
          style: "destructive",
          onPress: () => deleteMutation.mutate(tipo),
        },
      ],
    );
  };

  if (initializing || classTypesQuery.isLoading) {
    return (
      <Screen edges={[]} scroll={false}>
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator color={colors.accent.cyan} />
        </View>
      </Screen>
    );
  }

  if (role !== "admin") {
    return (
      <Screen edges={[]} scroll={false}>
        <View className="flex-1 items-center justify-center px-4">
          <Text className="text-center text-2xl font-bold text-white" variant="title">
            Acceso admin requerido
          </Text>
          <Text className="mt-2 text-center text-sm text-muted">
            Solo admins pueden gestionar tipos de clase.
          </Text>
        </View>
      </Screen>
    );
  }

  return (
    <Screen edges={[]}>
      <View className="mb-5 mt-4 flex-row items-start justify-between gap-3">
        <View className="flex-1">
          <Text className="text-2xl font-bold text-white" variant="title">Tipos de Clase</Text>
          <Text className="mt-1 text-sm text-muted">
            Crea, edita, desactiva o elimina tipos para categorizar clases.
          </Text>
        </View>
        {!isFormVisible ? (
          <Pressable
            className="rounded-xl border border-border bg-surface px-4 py-3"
            onPress={startNewType}
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
              Catalogo ({filteredTypes.length})
            </Text>
            {classTypesQuery.isError ? (
              <Text className="text-sm text-rose-400">
                No se pudieron cargar los tipos de clase.
              </Text>
            ) : filteredTypes.length ? (
              filteredTypes.map((tipo) => {
              const selected = selectedType?.id === tipo.id;
              return (
                <Pressable
                  key={tipo.id}
                  className={`mb-3 rounded-xl border p-3 ${selected ? "border-accent-cyan bg-accent-cyan/10" : "border-border bg-background"}`}
                  onPress={() => {
                    setSelectedType(tipo);
                    setIsFormVisible(true);
                  }}
                >
                  <View className="flex-row items-start justify-between gap-3">
                    <View className="flex-1">
                      <Text className="font-bold text-white">{tipo.nombre}</Text>
                      <Text className="mt-1 text-xs text-muted">{tipo.slug}</Text>
                      {!!tipo.descripcion && (
                        <Text className="mt-2 text-sm text-muted">{tipo.descripcion}</Text>
                      )}
                    </View>
                    <View className="items-end gap-2">
                      <Pressable
                        className={`rounded-full border px-3 py-2 ${tipo.is_active ? "border-accent-cyan/60 bg-accent-cyan/10" : "border-accent-amber/60 bg-accent-amber/10"}`}
                        disabled={activeMutation.isPending}
                        onPress={(event) => {
                          event.stopPropagation();
                          confirmToggleActive(tipo);
                        }}
                      >
                        <Text
                          className={`text-xs font-bold ${tipo.is_active ? "text-accent-cyan" : "text-accent-amber"}`}
                        >
                          {tipo.is_active ? "ACTIVO" : "INACTIVO"}
                        </Text>
                      </Pressable>
                      <Text className="text-[11px] text-muted">Orden {tipo.sort_order}</Text>
                    </View>
                  </View>
                </Pressable>
              );
            })
          ) : (
            <Text className="text-sm text-muted">
              {statusFilter !== "all"
                ? "No hay tipos de clase que coincidan con el filtro."
                : "Aun no hay tipos de clase."}
            </Text>
          )}
          </View>
        </>
      ) : (
        <>
          <Text className="mb-3 text-lg font-bold text-white">
            {selectedType ? "Editar Tipo" : "Crear Tipo"}
          </Text>
          <Input
            control={control}
            name="nombre"
            label="Nombre"
            placeholder="Fuerza"
            autoCapitalize="words"
          />
          <Input
            control={control}
            name="slug"
            label="Slug"
            placeholder="fuerza"
            autoCapitalize="none"
          />
          <Input
            control={control}
            name="descripcion"
            label="Descripcion"
            placeholder="Entrenamientos enfocados en fuerza"
            autoCapitalize="sentences"
          />
          <Input
            control={control}
            name="sort_order"
            label="Orden"
            placeholder="10"
            autoCapitalize="none"
          />
          <Input
            control={control}
            name="image_url"
            label="Imagen (URL)"
            placeholder="https://..."
            autoCapitalize="none"
          />
          <Button
            label={selectedType ? "Guardar Cambios" : "Crear Tipo"}
            onPress={handleSubmit((values) => saveMutation.mutate(values))}
            loading={saveMutation.isPending}
          />
          {selectedType ? (
            <Button
              label="Eliminar Tipo"
              variant="secondary"
              loading={deleteMutation.isPending}
              onPress={() => confirmDelete(selectedType)}
            />
          ) : null}
          <Button label="Cancelar" variant="secondary" onPress={cancelForm} />
        </>
      )}
    </Screen>
  );
}
