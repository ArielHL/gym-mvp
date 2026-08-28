import { ActivityIndicator, Alert, Linking, Pressable, Text, View } from "react-native";
import { useQuery } from "@tanstack/react-query";
import { useRouter } from "expo-router";
import { Button } from "@/components/ui/Button";
import { Screen } from "@/components/ui/Screen";
import { queryKeys } from "@/constants/queryKeys";
import {
  fetchSalesContact,
  openWhatsApp,
  whatsappDigits,
} from "@/features/home/services/salesContactService";

export function SalesContactScreen() {
  const router = useRouter();
  const contactQuery = useQuery({
    queryKey: queryKeys.salesContact,
    queryFn: fetchSalesContact,
  });

  const contact = contactQuery.data;
  const hasWhatsApp = Boolean(contact && whatsappDigits(contact.whatsapp));

  const onWhatsApp = async () => {
    if (!contact) {
      return;
    }
    try {
      await openWhatsApp(contact);
    } catch (error) {
      Alert.alert("WhatsApp", (error as Error).message);
    }
  };

  const onCall = async () => {
    const phone = contact?.phone.replace(/\s/g, "") ?? "";
    if (!phone) {
      return;
    }
    await Linking.openURL(`tel:${phone}`);
  };

  const onEmail = async () => {
    const email = contact?.email.trim() ?? "";
    if (!email) {
      return;
    }
    await Linking.openURL(`mailto:${email}`);
  };

  return (
    <Screen>
      <View className="mb-6 mt-2 flex-row items-center justify-between">
        <Pressable onPress={() => router.back()} className="px-2 py-2" hitSlop={8}>
          <Text className="text-base font-bold text-accent-cyan">Volver</Text>
        </Pressable>
        <Text className="text-lg font-black text-white">Suscripción</Text>
        <View className="w-16" />
      </View>

      <Text className="text-2xl font-bold text-white">Paga una suscripción</Text>
      <Text className="mt-2 text-sm leading-5 text-gray-400">
        Escribinos para conocer planes, precios y formas de pago. Un asesor te
        va a contactar por WhatsApp.
      </Text>

      {contactQuery.isLoading ? (
        <View className="mt-10 items-center">
          <ActivityIndicator color="#22D3EE" />
        </View>
      ) : contactQuery.isError ? (
        <Text className="mt-6 text-sm text-rose-400">
          No se pudo cargar la información de contacto.
        </Text>
      ) : (
        <View className="mt-6 rounded-2xl border border-border bg-surface p-4">
          <Text className="text-base font-bold text-white">Contacto de ventas</Text>
          {contact?.phone ? (
            <Pressable className="mt-3" onPress={onCall}>
              <Text className="text-xs uppercase tracking-wide text-gray-500">
                Teléfono
              </Text>
              <Text className="mt-1 text-base text-cyan-300">{contact.phone}</Text>
            </Pressable>
          ) : null}
          {contact?.email ? (
            <Pressable className="mt-3" onPress={onEmail}>
              <Text className="text-xs uppercase tracking-wide text-gray-500">
                Email
              </Text>
              <Text className="mt-1 text-base text-cyan-300">{contact.email}</Text>
            </Pressable>
          ) : null}
          {hasWhatsApp ? (
            <View className="mt-3">
              <Text className="text-xs uppercase tracking-wide text-gray-500">
                WhatsApp
              </Text>
              <Text className="mt-1 text-base text-white">{contact?.whatsapp}</Text>
            </View>
          ) : (
            <Text className="mt-3 text-sm text-amber-300">
              El número de WhatsApp todavía no está configurado.
            </Text>
          )}
          <Button
            label="Escribir por WhatsApp"
            onPress={onWhatsApp}
            disabled={!hasWhatsApp}
          />
        </View>
      )}
    </Screen>
  );
}
