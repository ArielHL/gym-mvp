import { useEffect, useMemo, useState } from "react";
import { ActivityIndicator, Alert, Pressable, View } from "react-native";
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
  type Trainer,
  createTrainer,
  fetchTrainers,
  setTrainerActive,
  updateTrainer,
} from "@/features/trainers/services/trainersService";

import { colors } from "@/theme";
import { Text } from "@/components/ui/Text";
const schema = z.object({
  name: z.string().min(2, "Nombre requerido"),
  document: z.string().min(1, "Documento requerido"),
  tel: z.string().optional(),
  email: z.string().email("Email inválido"),
  address: z.string().optional(),
});

type FormValues = z.infer<typeof schema>;

const emptyValues: FormValues = {
  name: "",
  document: "",
  tel: "",
  email: "",
  address: "",
};

function valuesFromTrainer(trainer: Trainer): FormValues {
  return {
    name: trainer.name,
    document: trainer.document,
    tel: trainer.tel ?? "",
    email: trainer.email,
    address: trainer.address ?? "",
  };
}

export function AdminTrainersScreen() {
  const { role, initializing } = useAuthState();
  const queryClient = useQueryClient();
  const [selectedTrainer, setSelectedTrainer] = useState<Trainer | null>(null);
  const [isFormVisible, setIsFormVisible] = useState(false);
  const [statusFilter, setStatusFilter] = useState<
    "all" | "active" | "inactive"
  >("active");
  const { control, handleSubmit, reset } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: emptyValues,
  });

  const trainersQuery = useQuery({
    queryKey: queryKeys.trainers,
    queryFn: fetchTrainers,
    enabled: role === "admin",
  });

  const filteredTrainers = useMemo(() => {
    const items = trainersQuery.data ?? [];
    if (statusFilter === "all") {
      return items;
    }
    return items.filter(
      (trainer) => (statusFilter === "active") === trainer.is_active,
    );
  }, [trainersQuery.data, statusFilter]);

  useEffect(() => {
    if (selectedTrainer) {
      reset(valuesFromTrainer(selectedTrainer));
    }
  }, [reset, selectedTrainer]);

  const invalidateTrainers = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: queryKeys.trainers }),
      queryClient.invalidateQueries({ queryKey: queryKeys.activeTrainers }),
    ]);
  };

  const saveMutation = useMutation({
    mutationFn: async (values: FormValues) => {
      const payload = {
        ...values,
        is_active: selectedTrainer?.is_active ?? true,
      };

      if (selectedTrainer) {
        return updateTrainer(selectedTrainer.id, payload);
      }

      return createTrainer(payload);
    },
    onSuccess: async () => {
      await invalidateTrainers();
      setSelectedTrainer(null);
      setIsFormVisible(false);
      reset(emptyValues);
      Alert.alert("Guardado", "Entrenador guardado.");
    },
    onError: (error) => {
      Alert.alert("Error al guardar", (error as Error).message);
    },
  });

  const activeMutation = useMutation({
    mutationFn: async ({
      trainer,
      isActive,
    }: {
      trainer: Trainer;
      isActive: boolean;
    }) => {
      await setTrainerActive(trainer.id, isActive);
    },
    onSuccess: async (_, variables) => {
      await invalidateTrainers();
      setSelectedTrainer((current) =>
        current ? { ...current, is_active: variables.isActive } : current,
      );
      Alert.alert(
        variables.isActive ? "Reactivado" : "Desactivado",
        "Estado del entrenador actualizado.",
      );
    },
    onError: (error) => {
      Alert.alert("Error al actualizar", (error as Error).message);
    },
  });

  const startNewTrainer = () => {
    setSelectedTrainer(null);
    reset(emptyValues);
    setIsFormVisible(true);
  };

  const cancelForm = () => {
    setSelectedTrainer(null);
    reset(emptyValues);
    setIsFormVisible(false);
  };

  const confirmToggleActive = (trainer: Trainer) => {
    const nextIsActive = !trainer.is_active;

    if (nextIsActive) {
      activeMutation.mutate({ trainer, isActive: true });
      return;
    }

    Alert.alert(
      "Desactivar entrenador",
      "El registro se mantiene, pero no se podrá asignar a clases nuevas.",
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Desactivar",
          style: "destructive",
          onPress: () => activeMutation.mutate({ trainer, isActive: false }),
        },
      ],
    );
  };

  if (initializing || trainersQuery.isLoading) {
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
            Acceso de Administrador Requerido
          </Text>
          <Text className="mt-2 text-center text-sm text-muted">
            Solo los administradores pueden gestionar entrenadores.
          </Text>
        </View>
      </Screen>
    );
  }

  return (
    <Screen edges={[]}>
      <View className="mb-5 mt-4 flex-row items-start justify-between gap-3">
        <View className="flex-1">
          <Text className="text-2xl font-bold text-white" variant="title">
            Gestionar Entrenadores
          </Text>
          <Text className="mt-1 text-sm text-muted">
            Agregar entrenadores, actualizar datos de contacto y desactivar
            perfiles no utilizados.
          </Text>
        </View>
        {!isFormVisible ? (
          <Pressable
            className="rounded-xl border border-border bg-surface px-4 py-3"
            onPress={startNewTrainer}
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
              Entrenadores ({filteredTrainers.length})
            </Text>
            {trainersQuery.isError ? (
              <Text className="text-sm text-rose-400">
                No se pudieron cargar los entrenadores.
              </Text>
            ) : filteredTrainers.length ? (
              filteredTrainers.map((trainer) => {
                const selected = selectedTrainer?.id === trainer.id;
                return (
                  <Pressable
                    key={trainer.id}
                    className={`mb-3 rounded-xl border p-3 ${selected ? "border-accent-cyan bg-accent-cyan/10" : "border-border bg-background"}`}
                    onPress={() => {
                      setSelectedTrainer(trainer);
                      setIsFormVisible(true);
                    }}
                  >
                    <View className="flex-row items-start justify-between gap-3">
                      <View className="flex-1">
                        <Text className="font-bold text-white">
                          {trainer.name}
                        </Text>
                        <Text className="mt-1 text-xs text-muted">
                          {trainer.document} · {trainer.email}
                        </Text>
                        {trainer.tel ? (
                          <Text className="mt-1 text-xs text-muted">
                            {trainer.tel}
                          </Text>
                        ) : null}
                      </View>
                      <Pressable
                        className={`rounded-full border px-3 py-2 ${trainer.is_active ? "border-accent-cyan/60 bg-accent-cyan/10" : "border-accent-amber/60 bg-accent-amber/10"}`}
                        disabled={activeMutation.isPending}
                        onPress={(event) => {
                          event.stopPropagation();
                          confirmToggleActive(trainer);
                        }}
                      >
                        <Text
                          className={`text-xs font-bold ${trainer.is_active ? "text-accent-cyan" : "text-accent-amber"}`}
                        >
                          {trainer.is_active ? "ACTIVO" : "INACTIVO"}
                        </Text>
                      </Pressable>
                    </View>
                  </Pressable>
                );
              })
            ) : (
              <Text className="text-sm text-muted">
                {statusFilter !== "all"
                  ? "No hay entrenadores que coincidan con el filtro seleccionado."
                  : "Aún no hay entrenadores."}
              </Text>
            )}
          </View>
        </>
      ) : (
        <>
          <Text className="mb-3 text-lg font-bold text-white">
            {selectedTrainer ? "Editar Entrenador" : "Crear Entrenador"}
          </Text>
          <Input
            control={control}
            name="name"
            label="Nombre"
            placeholder="Alejandro"
            autoCapitalize="words"
          />
          <Input
            control={control}
            name="document"
            label="Documento"
            placeholder="12345678"
          />
          <Input
            control={control}
            name="email"
            label="Email"
            placeholder="entrenador@gym.com"
            autoCapitalize="none"
          />
          <Input
            control={control}
            name="tel"
            label="Teléfono"
            placeholder="11 1234 5678"
          />
          <Input
            control={control}
            name="address"
            label="Dirección"
            placeholder="Av. Fitness 123"
            autoCapitalize="words"
          />
          <Button
            label={selectedTrainer ? "Guardar Cambios" : "Crear Entrenador"}
            onPress={handleSubmit((values) => saveMutation.mutate(values))}
            loading={saveMutation.isPending}
          />
          <Button label="Cancelar" variant="secondary" onPress={cancelForm} />
        </>
      )}
    </Screen>
  );
}
