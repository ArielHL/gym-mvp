import { useEffect, useState } from "react";
import { ActivityIndicator, Alert, Pressable, Text, View } from "react-native";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Controller, useForm } from "react-hook-form";
import { z } from "zod";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Screen } from "@/components/ui/Screen";
import { queryKeys } from "@/constants/queryKeys";
import { useAuthState } from "@/features/auth/hooks/useAuthState";
import { fetchWeeksAheadToGenerate } from "@/features/admin/services/adminSettingsService";
import {
  type ClassTemplate,
  createClassTemplate,
  fetchClassTemplates,
  setClassTemplateActive,
  updateClassTemplate,
} from "@/features/classes/services/classesService";
import { fetchLocations } from "@/features/locations/services/locationsService";
import { toDateKey } from "@/utils/date";

const dateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Use YYYY-MM-DD");

const schema = z.object({
  title: z.string().min(2),
  description: z.string().min(5),
  trainer_name: z.string().min(2),
  exercise_type: z.string().min(2),
  duration_minutes: z.coerce.number().int().min(10).max(240),
  day_of_week: z.coerce.number().int().min(0).max(6),
  start_time: z.string().regex(/^\d{2}:\d{2}$/, "Use HH:MM"),
  capacity: z.coerce.number().int().min(1).max(500),
  difficulty_level: z.enum(["beginner", "intermediate", "advanced"]),
  location_id: z.string().uuid("Select a location"),
  valid_from: dateSchema,
  valid_until: z.union([dateSchema, z.literal("")]).optional(),
});

type FormValues = z.infer<typeof schema>;

const emptyValues: FormValues = {
  title: "",
  description: "",
  trainer_name: "",
  exercise_type: "general fitness",
  duration_minutes: 60,
  day_of_week: 1,
  start_time: "18:00",
  capacity: 20,
  difficulty_level: "beginner",
  location_id: "",
  valid_from: toDateKey(new Date()),
  valid_until: "",
};

const dayLabels = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function valuesFromTemplate(template: ClassTemplate): FormValues {
  return {
    title: template.title,
    description: template.description,
    trainer_name: template.trainer_name,
    exercise_type: template.exercise_type,
    duration_minutes: template.duration_minutes,
    day_of_week: template.day_of_week,
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
  const { control, handleSubmit, reset, setValue } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: emptyValues,
  });

  const templatesQuery = useQuery({
    queryKey: queryKeys.classTemplates,
    queryFn: fetchClassTemplates,
    enabled: role === "admin",
  });

  const settingsQuery = useQuery({
    queryKey: queryKeys.adminSettings,
    queryFn: fetchWeeksAheadToGenerate,
    enabled: role === "admin",
  });

  const locationsQuery = useQuery({
    queryKey: queryKeys.locations,
    queryFn: fetchLocations,
    enabled: role === "admin",
  });

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

  const invalidateClassData = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: queryKeys.classTemplates }),
      queryClient.invalidateQueries({ queryKey: queryKeys.classes }),
    ]);
  };

  const saveMutation = useMutation({
    mutationFn: async (values: FormValues) => {
      const weeksAhead = settingsQuery.data ?? 3;
      const payload = {
        ...values,
        valid_until: values.valid_until || null,
        is_active: selectedTemplate?.is_active ?? true,
      };

      if (selectedTemplate) {
        return updateClassTemplate(selectedTemplate.id, payload, weeksAhead);
      }

      return createClassTemplate(payload, weeksAhead);
    },
    onSuccess: async () => {
      await invalidateClassData();
      setSelectedTemplate(null);
      setIsFormVisible(false);
      reset(emptyValues);
      Alert.alert(
        "Saved",
        `Class saved and future sessions generated ${settingsQuery.data ?? 3} weeks ahead.`,
      );
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
      await setClassTemplateActive(
        template.id,
        isActive,
        settingsQuery.data ?? 3,
      );
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
      "Deactivate class",
      "This hides the class from members but keeps history and bookings intact.",
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
            Admin access required
          </Text>
          <Text className="mt-2 text-center text-sm text-gray-500">
            Only admins can manage classes.
          </Text>
        </View>
      </Screen>
    );
  }

  return (
    <Screen>
      <View className="mb-5 mt-4 flex-row items-start justify-between gap-3">
        <View className="flex-1">
          <Text className="text-2xl font-bold text-white">Manage Classes</Text>
          <Text className="mt-1 text-sm text-gray-400">
            Create templates, edit class data, and soft-delete inactive classes.
          </Text>
        </View>
        {!isFormVisible ? (
          <Pressable
            className="rounded-xl border border-border bg-surface px-4 py-3"
            onPress={startNewTemplate}
          >
            <Text className="font-semibold text-white">New</Text>
          </Pressable>
        ) : null}
      </View>

      {!isFormVisible ? (
        <View className="mb-6 rounded-2xl border border-border bg-surface p-4">
          <Text className="mb-3 text-base font-bold text-white">
            Class Templates
          </Text>
          {templatesQuery.isError ? (
            <Text className="text-sm text-rose-400">
              Could not load class templates.
            </Text>
          ) : templatesQuery.data?.length ? (
            templatesQuery.data.map((template) => {
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
                        {dayLabels[template.day_of_week]} at{" "}
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
              No class templates yet.
            </Text>
          )}
        </View>
      ) : (
        <>
          <Text className="mb-3 text-lg font-bold text-white">
            {selectedTemplate ? "Edit Class" : "Create Class"}
          </Text>
          <Input
            control={control}
            name="title"
            label="Title"
            placeholder="Morning Strength"
          />
          <Input
            control={control}
            name="description"
            label="Description"
            placeholder="Full body circuit"
          />
          <Input
            control={control}
            name="trainer_name"
            label="Trainer"
            placeholder="Alex"
          />
          <Input
            control={control}
            name="exercise_type"
            label="Type"
            placeholder="strength"
          />
          <Input
            control={control}
            name="duration_minutes"
            label="Duration (minutes)"
            placeholder="60"
          />
          <Input
            control={control}
            name="day_of_week"
            label="Day (0=Sun ... 6=Sat)"
            placeholder="1"
          />
          <Input
            control={control}
            name="start_time"
            label="Start Time (HH:MM)"
            placeholder="18:00"
          />
          <Input
            control={control}
            name="capacity"
            label="Capacity"
            placeholder="20"
          />
          <Input
            control={control}
            name="difficulty_level"
            label="Difficulty (beginner/intermediate/advanced)"
            placeholder="beginner"
          />
          <Controller
            control={control}
            name="location_id"
            render={({ field: { value, onChange }, fieldState: { error } }) => (
              <View className="mb-3">
                <Text className="mb-1 text-sm font-medium text-white">
                  Location
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
                    {locationsQuery.data.map((location) => {
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
            label="Valid From (YYYY-MM-DD)"
            placeholder="2026-08-01"
          />
          <Input
            control={control}
            name="valid_until"
            label="Valid Until (optional YYYY-MM-DD)"
            placeholder="2026-08-31"
          />
          <Text className="mt-1 text-xs text-gray-500">
            Future sessions will be generated {settingsQuery.data ?? 3} weeks
            ahead. Change this in Class Settings.
          </Text>
          <Button
            label={selectedTemplate ? "Save Changes" : "Create Class"}
            onPress={handleSubmit((values) => saveMutation.mutate(values))}
            loading={saveMutation.isPending}
          />
          <Button label="Cancel" variant="secondary" onPress={cancelForm} />
        </>
      )}
    </Screen>
  );
}
