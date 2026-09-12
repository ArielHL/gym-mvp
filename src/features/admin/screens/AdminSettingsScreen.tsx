import { useEffect } from "react";
import { ActivityIndicator, Alert, Pressable, View } from "react-native";
import * as Contacts from "expo-contacts";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import parsePhoneNumberFromString, {
  type CountryCode,
} from "libphonenumber-js/max";
import { z } from "zod";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Screen } from "@/components/ui/Screen";
import { queryKeys } from "@/constants/queryKeys";
import { useAuthState } from "@/features/auth/hooks/useAuthState";
import { hasAdminAccess } from "@/features/auth/role";
import {
  fetchAdminSettings,
  updateCancellationWindow,
} from "@/features/admin/services/settingsService";
import {
  fetchSalesContact,
  formatPhoneForDisplay,
  saveSalesContact,
} from "@/features/home/services/salesContactService";
import {
  fetchGymBranding,
  saveGymBranding,
} from "@/features/home/services/gymBrandingService";

import { colors } from "@/theme";
import { Text } from "@/components/ui/Text";

const supportedCountryCodes = new Set<CountryCode>([
  "AR",
  "UY",
  "CL",
  "CO",
  "MX",
  "ES",
]);
const mobileTypes = new Set(["MOBILE", "FIXED_LINE_OR_MOBILE"]);
type PhoneFieldName = "whatsapp" | "phone";

function parseSupportedMobile(value: string) {
  const parsed = parsePhoneNumberFromString(value.trim());
  if (!parsed?.isValid()) {
    return undefined;
  }
  if (!parsed.country || !supportedCountryCodes.has(parsed.country)) {
    return undefined;
  }
  const type = parsed.getType();
  return type && mobileTypes.has(type) ? parsed : undefined;
}

function formatMobileForSave(value: string) {
  return parseSupportedMobile(value)?.number ?? value.trim();
}

const schema = z.object({
  cancellationWindowHours: z
    .string()
    .regex(/^\d+(\.\d+)?$/, "Ingresa un número válido"),
});

const salesSchema = z
  .object({
    whatsapp: z.string().min(1, "Ingresa un WhatsApp"),
    phone: z.string().optional(),
    email: z.union([z.literal(""), z.string().email("Email inválido")]),
    message: z.string().optional(),
  })
  .superRefine((values, context) => {
    if (!parseSupportedMobile(values.whatsapp)) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message:
          "Ingresa un WhatsApp móvil válido con código de país, por ejemplo +54 9 11 2345 6789",
        path: ["whatsapp"],
      });
    }

    if (values.phone && !parseSupportedMobile(values.phone)) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message:
          "Ingresa un teléfono móvil válido con código de país, por ejemplo +54 9 11 2345 6789",
        path: ["phone"],
      });
    }
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
    setValue: setSalesValue,
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
    enabled: hasAdminAccess(role),
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
    enabled: hasAdminAccess(role),
  });

  useEffect(() => {
    if (salesQuery.data) {
      resetSales({
        whatsapp: formatPhoneForDisplay(salesQuery.data.whatsapp),
        phone: formatPhoneForDisplay(salesQuery.data.phone),
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
    enabled: hasAdminAccess(role),
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
        whatsapp: formatMobileForSave(values.whatsapp),
        phone: values.phone ? formatMobileForSave(values.phone) : "",
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

  const pasteContactPhone = async (target: PhoneFieldName) => {
    const permission = await Contacts.requestPermissionsAsync();
    if (permission.status !== "granted") {
      Alert.alert(
        "Permiso requerido",
        "Necesitamos acceso a contactos para seleccionar un teléfono.",
      );
      return;
    }

    const contact = await Contacts.Contact.presentPicker();
    if (!contact) {
      return;
    }

    const details = await contact.getDetails([Contacts.ContactField.PHONES]);
    const phones = details.phones?.filter((phone) => phone.number) ?? [];

    if (phones.length === 0) {
      Alert.alert(
        "Sin teléfonos",
        "El contacto seleccionado no tiene teléfonos.",
      );
      return;
    }

    const applyPhone = (phoneNumber: string) => {
      const parsed = parseSupportedMobile(phoneNumber);
      const formattedPhone = parsed
        ? parsed.formatInternational()
        : phoneNumber.trim();
      setSalesValue(target, formattedPhone, {
        shouldDirty: true,
        shouldValidate: true,
      });

      if (!parsed) {
        Alert.alert(
          "Revisa el teléfono",
          "Pegamos el número. Agrega el código de país si falta, por ejemplo +54 9 11 2345 6789.",
        );
      }
    };

    if (phones.length === 1) {
      applyPhone(phones[0].number ?? "");
      return;
    }

    Alert.alert(
      "Selecciona un teléfono",
      "Este contacto tiene más de un teléfono.",
      [
        ...phones.slice(0, 5).map((phone) => ({
          text: phone.number ?? "Teléfono",
          onPress: () => applyPhone(phone.number ?? ""),
        })),
        { text: "Cancelar", style: "cancel" as const },
      ],
    );
  };

  if (initializing || settingsQuery.isLoading) {
    return (
      <Screen edges={[]} scroll={false}>
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator color={colors.accent.cyan} />
        </View>
      </Screen>
    );
  }

  if (!hasAdminAccess(role)) {
    return (
      <Screen edges={[]} scroll={false}>
        <View className="flex-1 items-center justify-center px-4">
          <Text className="text-center text-2xl font-bold text-white" variant="title">
            Se requiere acceso de administrador
          </Text>
          <Text className="mt-2 text-center text-sm text-muted">
            Solo los administradores pueden gestionar los ajustes de clases.
          </Text>
        </View>
      </Screen>
    );
  }

  return (
    <Screen edges={[]}>
      <Text className="mb-2 mt-4 text-2xl font-bold text-white" variant="title">
        Nombre del gimnasio
      </Text>
      <Text className="mb-3 text-sm leading-5 text-muted">
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
            label="Guardar nombre"
            onPress={handleBrandingSubmit((values) =>
              saveBrandingMutation.mutate(values),
            )}
            loading={saveBrandingMutation.isPending}
          />
        </View>
      )}

      <Text className="mb-2 text-2xl font-bold text-white" variant="title">
        Ajustes de clases
      </Text>
      <Text className="mb-3 text-sm leading-5 text-muted">
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
          <Text className="mb-3 text-sm leading-5 text-muted">
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
            label="Guardar ajustes"
            onPress={handleSubmit((values) => saveMutation.mutate(values))}
            loading={saveMutation.isPending}
          />
        </View>
      )}

      <Text className="mb-2 mt-8 text-2xl font-bold text-white" variant="title">
        Contacto de ventas
      </Text>
      <Text className="mb-3 text-sm leading-5 text-muted">
        Este WhatsApp se muestra en Paga una suscripción para que los miembros
        escriban a un asesor. Incluí el código de país, por ejemplo +54 9 11
        2345 6789.
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
            placeholder="+54 9 11 2345 6789"
            keyboardType="phone-pad"
          />
          <Pressable
            className="mb-3 rounded-xl border border-accent-cyan/60 bg-accent-cyan/10 px-4 py-3"
            onPress={() => void pasteContactPhone("whatsapp")}
          >
            <Text className="text-center font-semibold text-accent-cyan">
              Seleccionar contacto para WhatsApp
            </Text>
          </Pressable>
          <Input
            control={salesControl}
            name="phone"
            label="Teléfono"
            placeholder="+54 9 11 1234 5678"
            keyboardType="phone-pad"
          />
          <Pressable
            className="mb-3 rounded-xl border border-border bg-background px-4 py-3"
            onPress={() => void pasteContactPhone("phone")}
          >
            <Text className="text-center font-semibold text-white">
              Seleccionar contacto para teléfono
            </Text>
          </Pressable>
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
            label="Guardar contacto"
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
