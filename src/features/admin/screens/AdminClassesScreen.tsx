import { useEffect, useMemo, useState } from "react";
import { ActivityIndicator, Alert, Pressable, Text, View } from "react-native";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Controller, useForm } from "react-hook-form";
import { z } from "zod";
import { Button } from "@/components/ui/Button";
import { ClassTypePickerModal } from "@/components/ui/ClassTypePickerModal";
import { FilterChipRow } from "@/components/ui/FilterChipRow";
import { Input } from "@/components/ui/Input";
import { Screen } from "@/components/ui/Screen";
import { TimePickerModal } from "@/components/ui/TimePickerModal";
import { queryKeys } from "@/constants/queryKeys";
import { useAuthState } from "@/features/auth/hooks/useAuthState";
import { useActiveClassTypes } from "@/features/class-types/hooks/useClassTypes";
import {
  type ClassTemplate,
  createClassTemplate,
  fetchClassTemplates,
  setClassTemplateActive,
  updateClassTemplate,
} from "@/features/classes/services/classesService";
import { fetchLocations } from "@/features/locations/services/locationsService";
import { fetchTrainers } from "@/features/trainers/services/trainersService";
import { toDateKey } from "@/utils/date";

const dateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Use YYYY-MM-DD");

const schema = z.object({
  title: z.string().min(2),
  description: z.string().min(5),
  trainer_id: z.string().uuid("Selecciona un entrenador"),
  class_type_id: z.string().uuid("Selecciona un tipo de clase"),
  duration_minutes: z.coerce.number().int().min(10).max(240),
  days_of_week: z
    .array(z.number().int().min(0).max(6))
    .min(1, "Pick at least one day"),
  start_time: z.string().regex(/^\d{2}:\d{2}$/, "Select a valid time"),
  capacity: z.coerce.number().int().min(1).max(500),
  difficulty_level: z.enum(["beginner", "intermediate", "advanced"]),
  location_id: z.string().uuid("Select a location"),
  valid_from: dateSchema,
  valid_until: z.union([dateSchema, z.literal("")]).optional(),
});

type FormValues = z.infer<typeof schema>;

const difficultyOptions = [
  { label: "Principiante", value: "beginner" },
  { label: "Intermedio", value: "intermediate" },
  { label: "Avanzado", value: "advanced" },
] as const;

const dayOptions = [
  { label: "Dom", value: 0 },
  { label: "Lun", value: 1 },
  { label: "Mar", value: 2 },
  { label: "Mié", value: 3 },
  { label: "Jue", value: 4 },
  { label: "Vie", value: 5 },
  { label: "Sáb", value: 6 },
] as const;

function maskFromDays(days: number[]): number {
  return days.reduce((mask, day) => mask | (1 << day), 0);
}

function daysFromMask(mask: number): number[] {
  return dayOptions
    .filter((option) => (mask & (1 << option.value)) !== 0)
    .map((option) => option.value);
}

function formatMask(mask: number): string {
  const labels = dayOptions
    .filter((option) => (mask & (1 << option.value)) !== 0)
    .map((option) => option.label);
  return labels.length ? labels.join(" + ") : "No days";
}

const emptyValues: FormValues = {
  title: "",
  description: "",
  trainer_id: "",
  class_type_id: "",
  duration_minutes: 60,
  days_of_week: [1],
  start_time: "18:00",
  capacity: 20,
  difficulty_level: "beginner",
  location_id: "",
  valid_from: toDateKey(new Date()),
  valid_until: "",
};

function valuesFromTemplate(template: ClassTemplate): FormValues {
  return {
    title: template.title,
    description: template.description,
    trainer_id: template.trainer_id,
    class_type_id: template.class_type_id,
    duration_minutes: template.duration_minutes,
    days_of_week: daysFromMask(template.days_of_week_mask),
    start_time: template.start_time.slice(0, 5),
    capacity: template.capacity,
    difficulty_level: template.difficulty_level,
    location_id: template.location_id,
    valid_from: template.valid_from,
    valid_until: template.valid_until ?? "",
  };
}

export function AdminClassesScreen() {
  const { role, initializing } = useAuthState();
  const queryClient = useQueryClient();
  const [selectedTemplate, setSelectedTemplate] =
    useState<ClassTemplate | null>(null);
  const [isFormVisible, setIsFormVisible] = useState(false);
  const [isTimePickerVisible, setIsTimePickerVisible] = useState(false);
  const [isTypePickerVisible, setIsTypePickerVisible] = useState(false);
  const [statusFilter, setStatusFilter] = useState<
    "all" | "active" | "inactive"
  >("active");
  const { control, handleSubmit, reset, setValue } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: emptyValues,
  });

  const templatesQuery = useQuery({
    queryKey: queryKeys.classTemplates,
    queryFn: fetchClassTemplates,
    enabled: role === "admin",
  });

  const locationsQuery = useQuery({
    queryKey: queryKeys.locations,
    queryFn: fetchLocations,
    enabled: role === "admin",
  });

  const trainersQuery = useQuery({
    queryKey: queryKeys.trainers,
    queryFn: fetchTrainers,
    enabled: role === "admin",
  });

  const classTypesQuery = useActiveClassTypes(role === "admin");

  const filteredTemplates = useMemo(() => {
    const items = templatesQuery.data ?? [];
    if (statusFilter === "all") {
      return items;
    }
    return items.filter(
      (template) => (statusFilter === "active") === template.is_active,
    );
  }, [templatesQuery.data, statusFilter]);

  useEffect(() => {
    if (selectedTemplate) {
      reset(valuesFromTemplate(selectedTemplate));
    }
  }, [reset, selectedTemplate]);

  useEffect(() => {
    if (selectedTemplate || !isFormVisible || !locationsQuery.data?.length) {
      return;
    }

    setValue("location_id", locationsQuery.data[0].id, {
      shouldDirty: false,
      shouldTouch: false,
      shouldValidate: false,
    });
  }, [isFormVisible, locationsQuery.data, selectedTemplate, setValue]);

  useEffect(() => {
    if (selectedTemplate || !isFormVisible || !trainersQuery.data?.length) {
      return;
    }

    const defaultTrainer =
      trainersQuery.data.find((trainer) => trainer.is_active) ??
      trainersQuery.data[0];

    setValue("trainer_id", defaultTrainer.id, {
      shouldDirty: false,
      shouldTouch: false,
      shouldValidate: false,
    });
  }, [isFormVisible, selectedTemplate, setValue, trainersQuery.data]);

  useEffect(() => {
    if (selectedTemplate || !isFormVisible || !classTypesQuery.data?.length) {
      return;
    }

    setValue("class_type_id", classTypesQuery.data[0].id, {
      shouldDirty: false,
      shouldTouch: false,
      shouldValidate: false,
    });
  }, [classTypesQuery.data, isFormVisible, selectedTemplate, setValue]);

  const invalidateClassData = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: queryKeys.classTemplates }),
      queryClient.invalidateQueries({ queryKey: queryKeys.classes }),
      queryClient.invalidateQueries({
        queryKey: queryKeys.publicClassTemplates,
      }),
    ]);
  };

  const saveMutation = useMutation({
    mutationFn: async (values: FormValues) => {
      const payload = {
        ...values,
        days_of_week_mask: maskFromDays(values.days_of_week),
        valid_until: values.valid_until || null,
        is_active: selectedTemplate?.is_active ?? true,
      };

      if (selectedTemplate) {
        return updateClassTemplate(selectedTemplate.id, payload);
      }
      return createClassTemplate(payload);
    },
    onSuccess: async () => {
      await invalidateClassData();
      setSelectedTemplate(null);
      setIsFormVisible(false);
      reset(emptyValues);
      Alert.alert("Saved", "Recurring class template saved.");
    },
    onError: (error) => {
      Alert.alert("Save failed", (error as Error).message);
    },
  });

  const activeMutation = useMutation({
    mutationFn: async ({
      template,
      isActive,
    }: {
      template: ClassTemplate;
      isActive: boolean;
    }) => {
      await setClassTemplateActive(template.id, isActive);
    },
    onSuccess: async (_, variables) => {
      await invalidateClassData();
      setSelectedTemplate((current) =>
        current ? { ...current, is_active: variables.isActive } : current,
      );
      Alert.alert(
        variables.isActive ? "Reactivated" : "Deactivated",
        "Class status updated.",
      );
    },
    onError: (error) => {
      Alert.alert("Update failed", (error as Error).message);
    },
  });

  const startNewTemplate = () => {
    setSelectedTemplate(null);
    reset(emptyValues);
    setIsFormVisible(true);
  };

  const cancelForm = () => {
    setSelectedTemplate(null);
    reset(emptyValues);
    setIsFormVisible(false);
  };

  const confirmToggleActive = (template: ClassTemplate) => {
    const nextIsActive = !template.is_active;

    if (nextIsActive) {
      activeMutation.mutate({
        template,
        isActive: true,
      });
      return;
    }

    Alert.alert(
      "Desactivar clase",
      "Esto oculta la clase de los miembros pero mantiene el historial y las reservas intactas.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Deactivate",
          style: "destructive",
          onPress: () =>
            activeMutation.mutate({
              template,
              isActive: false,
            }),
        },
      ],
    );
  };

  if (initializing || templatesQuery.isLoading) {
    return (
      <Screen edges={[]} scroll={false}>
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator color="#22D3EE" />
        </View>
      </Screen>
    );
  }

  if (role !== "admin") {
    return (
      <Screen edges={[]} scroll={false}>
        <View className="flex-1 items-center justify-center px-4">
          <Text className="text-center text-2xl font-bold text-white">
            Requiere acceso de Administrador
          </Text>
          <Text className="mt-2 text-center text-sm text-gray-500">
            Solo Administradores pueden acceder a esta sección.
          </Text>
        </View>
      </Screen>
    );
  }

  return (
    <Screen edges={[]}>
      <View className="mb-5 mt-4 flex-row items-start justify-between gap-3">
        <View className="flex-1">
          <Text className="text-2xl font-bold text-white">Gestion de Clases</Text>
          <Text className="mt-1 text-sm text-gray-400">
            Crear plantillas recurrentes, editar datos de clases y desactivar
            clases inactivas.
          </Text>
        </View>
        {!isFormVisible ? (
          <Pressable
            className="rounded-xl border border-border bg-surface px-4 py-3"
            onPress={startNewTemplate}
          >
            <Text className="font-semibold text-white">Nueva</Text>
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
              Plantillas ({filteredTemplates.length})
            </Text>
            {templatesQuery.isError ? (
              <Text className="text-sm text-rose-400">
                No se pudieron cargar las plantillas de clases.
              </Text>
            ) : filteredTemplates.length ? (
              filteredTemplates.map((template) => {
              const selected = selectedTemplate?.id === template.id;
              return (
                <Pressable
                  key={template.id}
                  className={`mb-3 rounded-xl border p-3 ${selected ? "border-accent-cyan bg-cyan-950/30" : "border-border bg-background"}`}
                  onPress={() => {
                    setSelectedTemplate(template);
                    setIsFormVisible(true);
                  }}
                >
                  <View className="flex-row items-start justify-between gap-3">
                    <View className="flex-1">
                      <Text className="font-bold text-white">
                        {template.title}
                      </Text>
                      <Text className="mt-1 text-xs text-gray-400">
                        {formatMask(template.days_of_week_mask)} at{" "}
                        {template.start_time.slice(0, 5)} ·{" "}
                        {template.trainer_name} ·{" "}
                        {template.location_name ?? "Unknown location"}
                      </Text>
                    </View>
                    <Pressable
                      className={`rounded-full border px-3 py-2 ${template.is_active ? "border-cyan-400/60 bg-cyan-950/40" : "border-amber-400/60 bg-amber-950/30"}`}
                      disabled={activeMutation.isPending}
                      onPress={(event) => {
                        event.stopPropagation();
                        confirmToggleActive(template);
                      }}
                    >
                      <Text
                        className={`text-xs font-bold ${template.is_active ? "text-cyan-300" : "text-amber-300"}`}
                      >
                        {template.is_active ? "ACTIVE" : "INACTIVE"}
                      </Text>
                    </Pressable>
                  </View>
                </Pressable>
              );
            })
          ) : (
            <Text className="text-sm text-gray-400">
              {statusFilter !== "all"
                ? "No hay plantillas de clase que coincidan con el filtro seleccionado."
                : "Aún no hay plantillas de clase."}
            </Text>
          )}
          </View>
        </>
      ) : (
        <>
          <Text className="mb-3 text-lg font-bold text-white">
            {selectedTemplate ? "Editar Clase" : "Crear Clase"}
          </Text>
          <Input
            control={control}
            name="title"
            label="Título"
            placeholder="Fuerza Matutina"
          />
          <Input
            control={control}
            name="description"
            label="Descripción"
            placeholder="Circuito de cuerpo completo"
          />
          <Controller
            control={control}
            name="trainer_id"
            render={({ field: { value, onChange }, fieldState: { error } }) => (
              <View className="mb-3">
                <Text className="mb-1 text-sm font-medium text-white">
                  Entrenador
                </Text>
                {trainersQuery.isLoading ? (
                  <View className="h-12 flex-row items-center rounded-xl border border-border bg-surface px-3">
                    <ActivityIndicator color="#22D3EE" size="small" />
                    <Text className="ml-2 text-sm text-gray-400">
                      Cargando entrenadores...
                    </Text>
                  </View>
                ) : trainersQuery.isError ? (
                  <Text className="rounded-xl border border-rose-500/40 bg-rose-950/20 px-3 py-3 text-sm text-rose-300">
                    No se pudieron cargar los entrenadores.
                  </Text>
                ) : !trainersQuery.data?.length ? (
                  <Text className="rounded-xl border border-amber-500/40 bg-amber-950/20 px-3 py-3 text-sm text-amber-300">
                    No hay entrenadores. Crea uno desde Admin / Entrenadores.
                  </Text>
                ) : (
                  <View className="gap-2">
                    {trainersQuery.data
                    .filter((trainer) => trainer.is_active)
                    .map((trainer) => {
                      const selected = value === trainer.id;
                      return (
                        <Pressable
                          key={trainer.id}
                          className={`rounded-xl border px-3 py-3 ${selected ? "border-accent-cyan bg-cyan-950/30" : "border-border bg-surface"}`}
                          onPress={() => onChange(trainer.id)}
                        >
                          <Text className="font-semibold text-white">
                            {trainer.name}
                          </Text>
                          <Text className="mt-1 text-xs text-gray-400">
                            {trainer.tel || trainer.email}
                          </Text>
                          {!trainer.is_active ? (
                            <Text className="mt-1 text-xs font-semibold text-amber-300">
                              Inactivo
                            </Text>
                          ) : null}
                        </Pressable>
                      );
                    })}
                  </View>
                )}
                {!!error?.message && (
                  <Text className="mt-1 text-xs text-rose-400">
                    {error.message}
                  </Text>
                )}
              </View>
            )}
          />
          <Controller
            control={control}
            name="class_type_id"
            render={({ field: { value, onChange }, fieldState: { error } }) => {
              const selectedType = classTypesQuery.data?.find(
                (item) => item.id === value,
              );

              return (
                <View className="mb-3">
                  <Text className="mb-1 text-sm font-medium text-white">Tipo</Text>
                  {classTypesQuery.isLoading ? (
                    <View className="h-12 flex-row items-center rounded-xl border border-border bg-surface px-3">
                      <ActivityIndicator color="#22D3EE" size="small" />
                      <Text className="ml-2 text-sm text-gray-400">
                        Cargando tipos...
                      </Text>
                    </View>
                  ) : classTypesQuery.isError ? (
                    <Text className="rounded-xl border border-rose-500/40 bg-rose-950/20 px-3 py-3 text-sm text-rose-300">
                      No se pudieron cargar los tipos de clase.
                    </Text>
                  ) : !classTypesQuery.data?.length ? (
                    <Text className="rounded-xl border border-amber-500/40 bg-amber-950/20 px-3 py-3 text-sm text-amber-300">
                      No hay tipos activos. Crea uno desde Admin / Tipos de Clase.
                    </Text>
                  ) : (
                    <Pressable
                      className="h-12 flex-row items-center justify-between rounded-xl border border-border bg-surface px-3"
                      onPress={() => setIsTypePickerVisible(true)}
                    >
                      <Text className="text-base font-semibold text-white">
                        {selectedType?.nombre ?? "Selecciona un tipo"}
                      </Text>
                      <Text className="text-xs text-cyan-300">Cambiar</Text>
                    </Pressable>
                  )}
                  {!!selectedType?.descripcion && (
                    <Text className="mt-1 text-xs text-gray-400">
                      {selectedType.descripcion}
                    </Text>
                  )}
                  {!!error?.message && (
                    <Text className="mt-1 text-xs text-rose-400">
                      {error.message}
                    </Text>
                  )}
                  <ClassTypePickerModal
                    visible={isTypePickerVisible}
                    options={classTypesQuery.data ?? []}
                    selectedId={value}
                    onCancel={() => setIsTypePickerVisible(false)}
                    onSelect={(option) => {
                      onChange(option.id);
                      setIsTypePickerVisible(false);
                    }}
                  />
                </View>
              );
            }}
          />
          <Input
            control={control}
            name="duration_minutes"
            label="Duración (minutos)"
            placeholder="60"
          />
          <Controller
            control={control}
            name="days_of_week"
            render={({ field: { value, onChange }, fieldState: { error } }) => (
              <View className="mb-3">
                <Text className="mb-1 text-sm font-medium text-white">
                  Días
                </Text>
                <View className="flex-row flex-nowrap items-center rounded-xl border border-border bg-surface p-1">
                  {dayOptions.map((option) => {
                    const selected = value.includes(option.value);
                    return (
                      <Pressable
                        key={option.value}
                        className={`mx-[2px] min-w-0 flex-1 rounded-full border py-1 ${selected ? "border-accent-cyan bg-cyan-950/35" : "border-border bg-surface"}`}
                        onPress={() => {
                          if (selected) {
                            onChange(
                              value.filter((item) => item !== option.value),
                            );
                          } else {
                            onChange(
                              [...value, option.value].sort((a, b) => a - b),
                            );
                          }
                        }}
                      >
                        <Text
                          className={`text-center text-xs font-medium ${selected ? "text-cyan-300" : "text-gray-300"}`}
                        >
                          {option.label}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>
                {!!error?.message && (
                  <Text className="mt-1 text-xs text-rose-400">
                    {error.message}
                  </Text>
                )}
              </View>
            )}
          />
          <Controller
            control={control}
            name="start_time"
            render={({ field: { value, onChange }, fieldState: { error } }) => (
              <View className="mb-3">
                <Text className="mb-1 text-sm font-medium text-white">
                  Hora de inicio
                </Text>
                <Pressable
                  className="h-12 flex-row items-center justify-between rounded-xl border border-border bg-surface px-3"
                  onPress={() => setIsTimePickerVisible(true)}
                >
                  <Text className="text-base font-semibold text-white">{value}</Text>
                  <Text className="text-xs text-cyan-300">Cambiar</Text>
                </Pressable>
                <TimePickerModal
                  visible={isTimePickerVisible}
                  initialValue={value}
                  onCancel={() => setIsTimePickerVisible(false)}
                  onConfirm={(nextValue) => {
                    onChange(nextValue);
                    setIsTimePickerVisible(false);
                  }}
                />
                {!!error?.message && (
                  <Text className="mt-1 text-xs text-rose-400">
                    {error.message}
                  </Text>
                )}
              </View>
            )}
          />
          <Input
            control={control}
            name="capacity"
            label="Capacidad"
            placeholder="20"
          />
          <Controller
            control={control}
            name="difficulty_level"
            render={({ field: { value, onChange }, fieldState: { error } }) => (
              <View className="mb-3">
                <Text className="mb-1 text-sm font-medium text-white">
                  Dificultad
                </Text>
                <View className="flex-row flex-nowrap items-center rounded-xl border border-border bg-surface p-1">
                  {difficultyOptions.map((option) => {
                    const selected = value === option.value;
                    return (
                      <Pressable
                        key={option.value}
                        className={`mx-[2px] min-w-0 flex-1 rounded-full border py-2 ${selected ? "border-accent-cyan bg-cyan-950/35" : "border-border bg-surface"}`}
                        onPress={() => onChange(option.value)}
                      >
                        <Text
                          className={`text-center text-xs font-medium ${selected ? "text-cyan-300" : "text-gray-300"}`}
                        >
                          {option.label}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>
                {!!error?.message && (
                  <Text className="mt-1 text-xs text-rose-400">
                    {error.message}
                  </Text>
                )}
              </View>
            )}
          />
          <Controller
            control={control}
            name="location_id"
            render={({ field: { value, onChange }, fieldState: { error } }) => (
              <View className="mb-3">
                <Text className="mb-1 text-sm font-medium text-white">
                  Ubicación
                </Text>
                {locationsQuery.isLoading ? (
                  <View className="h-12 flex-row items-center rounded-xl border border-border bg-surface px-3">
                    <ActivityIndicator color="#22D3EE" size="small" />
                    <Text className="ml-2 text-sm text-gray-400">
                      Loading locations...
                    </Text>
                  </View>
                ) : locationsQuery.isError ? (
                  <Text className="rounded-xl border border-rose-500/40 bg-rose-950/20 px-3 py-3 text-sm text-rose-300">
                    Could not load locations.
                  </Text>
                ) : !locationsQuery.data?.length ? (
                  <Text className="rounded-xl border border-amber-500/40 bg-amber-950/20 px-3 py-3 text-sm text-amber-300">
                    No locations available. Create a location first.
                  </Text>
                ) : (
                  <View className="gap-2">
                    {locationsQuery.data
                    .filter((location) => location.is_active)
                    .map((location) => {
                      const selected = value === location.id;
                      return (
                        <Pressable
                          key={location.id}
                          className={`rounded-xl border px-3 py-3 ${selected ? "border-accent-cyan bg-cyan-950/30" : "border-border bg-surface"}`}
                          onPress={() => onChange(location.id)}
                        >
                          <Text className="font-semibold text-white">
                            {location.name}
                          </Text>
                          <Text className="mt-1 text-xs text-gray-400">
                            {location.address || "No address provided"}
                          </Text>
                          {!location.is_active ? (
                            <Text className="mt-1 text-xs font-semibold text-amber-300">
                              Inactive
                            </Text>
                          ) : null}
                        </Pressable>
                      );
                    })}
                  </View>
                )}
                {!!error?.message && (
                  <Text className="mt-1 text-xs text-rose-400">
                    {error.message}
                  </Text>
                )}
              </View>
            )}
          />
          <Input
            control={control}
            name="valid_from"
            label="Válido desde (YYYY-MM-DD)"
            placeholder="2026-08-01"
          />
          <Input
            control={control}
            name="valid_until"
            label="Válido hasta (opcional YYYY-MM-DD)"
            placeholder="2026-08-31"
          />
          <Button
            label={selectedTemplate ? "Guardar Cambios" : "Crear Clase"}
            onPress={handleSubmit((values) => saveMutation.mutate(values))}
            loading={saveMutation.isPending}
          />
          <Button label="Cancelar" variant="secondary" onPress={cancelForm} />
        </>
      )}
    </Screen>
  );
}
