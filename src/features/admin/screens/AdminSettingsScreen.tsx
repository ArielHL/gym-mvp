import { useEffect } from "react";
import { ActivityIndicator, Alert, Text, View } from "react-native";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Screen } from "@/components/ui/Screen";
import { queryKeys } from "@/constants/queryKeys";
import { useAuthState } from "@/features/auth/hooks/useAuthState";
import {
  fetchAdminSettings,
  updateCancellationWindow,
} from "@/features/admin/services/settingsService";

const schema = z.object({
  cancellationWindowHours: z
    .string()
    .regex(/^\d+(\.\d+)?$/, "Ingresa un número válido"),
});

type FormValues = z.infer<typeof schema>;

export function AdminSettingsScreen() {
  const { role, initializing } = useAuthState();
  const queryClient = useQueryClient();
  const { control, handleSubmit, reset } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { cancellationWindowHours: "" },
  });

  const settingsQuery = useQuery({
    queryKey: queryKeys.adminSettings,
    queryFn: fetchAdminSettings,
    enabled: role === "admin",
  });

  useEffect(() => {
    if (settingsQuery.data) {
      reset({
        cancellationWindowHours: String(
          settingsQuery.data.cancellation_window_hours,
        ),
      });
    }
  }, [reset, settingsQuery.data]);

  const saveMutation = useMutation({
    mutationFn: async (values: FormValues) =>
      updateCancellationWindow(Number(values.cancellationWindowHours)),
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: queryKeys.adminSettings,
      });
      Alert.alert("Guardado", "Ajustes actualizados correctamente.");
    },
    onError: (error) => {
      Alert.alert("Error al guardar", (error as Error).message);
    },
  });

  if (initializing || settingsQuery.isLoading) {
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
            Only admins can manage class settings.
          </Text>
        </View>
      </Screen>
    );
  }

  return (
    <Screen>
      <Text className="mb-2 mt-4 text-2xl font-bold text-white">
        Ajustes de Clases
      </Text>
      <Text className="mb-3 text-sm leading-5 text-gray-400">
        Configura las reglas que controlan las reservas y cancelaciones.
      </Text>

      {settingsQuery.isError ? (
        <Text className="text-sm text-rose-400">
          No se pudieron cargar los ajustes.
        </Text>
      ) : (
        <View className="rounded-2xl border border-border bg-surface p-4">
          <Text className="mb-1 text-base font-bold text-white">
            Ventana de cancelación
          </Text>
          <Text className="mb-3 text-sm leading-5 text-gray-400">
            Horas antes del inicio de la clase en las que los miembros ya no
            pueden cancelar su reserva.
          </Text>
          <Input
            control={control}
            name="cancellationWindowHours"
            label="Horas antes de la clase"
            placeholder="2"
          />
          <Button
            label="Guardar Ajustes"
            onPress={handleSubmit((values) => saveMutation.mutate(values))}
            loading={saveMutation.isPending}
          />
        </View>
      )}
    </Screen>
  );
}