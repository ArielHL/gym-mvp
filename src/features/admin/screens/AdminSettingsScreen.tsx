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
import {
  fetchSalesContact,
  saveSalesContact,
} from "@/features/home/services/salesContactService";
import {
  fetchGymBranding,
  saveGymBranding,
} from "@/features/home/services/gymBrandingService";

const schema = z.object({
  cancellationWindowHours: z
    .string()
    .regex(/^\d+(\.\d+)?$/, "Ingresa un número válido"),
});

const salesSchema = z.object({
  whatsapp: z.string(),
  phone: z.string().optional(),
  email: z.union([z.literal(""), z.string().email("Email inválido")]),
  message: z.string().optional(),
});

const brandingSchema = z.object({
  name: z.string().min(2, "Ingresa el nombre del gimnasio"),
});

type FormValues = z.infer<typeof schema>;
type SalesFormValues = z.infer<typeof salesSchema>;
type BrandingFormValues = z.infer<typeof brandingSchema>;

export function AdminSettingsScreen() {
  const { role, initializing } = useAuthState();
  const queryClient = useQueryClient();
  const { control, handleSubmit, reset } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { cancellationWindowHours: "" },
  });
  const {
    control: salesControl,
    handleSubmit: handleSalesSubmit,
    reset: resetSales,
  } = useForm<SalesFormValues>({
    resolver: zodResolver(salesSchema),
    defaultValues: { whatsapp: "", phone: "", email: "", message: "" },
  });
  const {
    control: brandingControl,
    handleSubmit: handleBrandingSubmit,
    reset: resetBranding,
  } = useForm<BrandingFormValues>({
    resolver: zodResolver(brandingSchema),
    defaultValues: { name: "" },
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

  const salesQuery = useQuery({
    queryKey: queryKeys.salesContact,
    queryFn: fetchSalesContact,
    enabled: role === "admin",
  });

  useEffect(() => {
    if (salesQuery.data) {
      resetSales({
        whatsapp: salesQuery.data.whatsapp,
        phone: salesQuery.data.phone,
        email: salesQuery.data.email,
        message: salesQuery.data.message,
      });
    }
  }, [resetSales, salesQuery.data]);

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

  const brandingQuery = useQuery({
    queryKey: queryKeys.gymBranding,
    queryFn: fetchGymBranding,
    enabled: role === "admin",
  });

  useEffect(() => {
    if (brandingQuery.data) {
      resetBranding({ name: brandingQuery.data.name });
    }
  }, [brandingQuery.data, resetBranding]);

  const saveBrandingMutation = useMutation({
    mutationFn: async (values: BrandingFormValues) =>
      saveGymBranding({ name: values.name }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: queryKeys.gymBranding,
      });
      Alert.alert("Guardado", "Nombre del gimnasio actualizado.");
    },
    onError: (error) => {
      Alert.alert("Error al guardar", (error as Error).message);
    },
  });

  const saveSalesMutation = useMutation({
    mutationFn: async (values: SalesFormValues) =>
      saveSalesContact({
        whatsapp: values.whatsapp,
        phone: values.phone ?? "",
        email: values.email,
        message: values.message ?? "",
      }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: queryKeys.salesContact,
      });
      Alert.alert("Guardado", "Contacto de ventas actualizado.");
    },
    onError: (error) => {
      Alert.alert("Error al guardar", (error as Error).message);
    },
  });

  if (initializing || settingsQuery.isLoading) {
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
    <Screen edges={[]}>
      <Text className="mb-2 mt-4 text-2xl font-bold text-white">
        Nombre del gimnasio
      </Text>
      <Text className="mb-3 text-sm leading-5 text-gray-400">
        Se muestra en el inicio, el menú, el inicio de sesión y el perfil.
      </Text>
      {brandingQuery.isError ? (
        <Text className="text-sm text-rose-400">
          No se pudo cargar el nombre del gimnasio.
        </Text>
      ) : (
        <View className="mb-8 rounded-2xl border border-border bg-surface p-4">
          <Input
            control={brandingControl}
            name="name"
            label="Nombre"
            placeholder="Flowly"
            autoCapitalize="words"
          />
          <Button
            label="Guardar Nombre"
            onPress={handleBrandingSubmit((values) =>
              saveBrandingMutation.mutate(values),
            )}
            loading={saveBrandingMutation.isPending}
          />
        </View>
      )}

      <Text className="mb-2 text-2xl font-bold text-white">
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

      <Text className="mb-2 mt-8 text-2xl font-bold text-white">
        Contacto de ventas
      </Text>
      <Text className="mb-3 text-sm leading-5 text-gray-400">
        Este WhatsApp se muestra en Paga una Suscripción para que los miembros
        escriban a un asesor.
      </Text>
      {salesQuery.isError ? (
        <Text className="text-sm text-rose-400">
          No se pudo cargar el contacto de ventas.
        </Text>
      ) : (
        <View className="rounded-2xl border border-border bg-surface p-4">
          <Input
            control={salesControl}
            name="whatsapp"
            label="WhatsApp"
            placeholder="5491123456789"
          />
          <Input
            control={salesControl}
            name="phone"
            label="Teléfono"
            placeholder="11 1234 5678"
          />
          <Input
            control={salesControl}
            name="email"
            label="Email"
            placeholder="ventas@gym.com"
            autoCapitalize="none"
          />
          <Input
            control={salesControl}
            name="message"
            label="Mensaje prefijado"
            placeholder="Hola, quiero información sobre una suscripción."
            autoCapitalize="sentences"
          />
          <Button
            label="Guardar Contacto"
            onPress={handleSalesSubmit((values) =>
              saveSalesMutation.mutate(values),
            )}
            loading={saveSalesMutation.isPending}
          />
        </View>
      )}
    </Screen>
  );
}