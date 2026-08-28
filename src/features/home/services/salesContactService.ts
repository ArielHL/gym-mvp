import { Linking } from "react-native";
import { apiGet, apiPatch } from "@/services/api/client";

export type SalesContact = {
  whatsapp: string;
  phone: string;
  email: string;
  message: string;
};

export function whatsappDigits(value: string): string {
  return value.replace(/\D/g, "");
}

export async function fetchSalesContact(): Promise<SalesContact> {
  const data = await apiGet<Partial<SalesContact>>("/content/sales-contact", {
    auth: false,
  });
  return {
    whatsapp: data.whatsapp ?? "",
    phone: data.phone ?? "",
    email: data.email ?? "",
    message: data.message ?? "",
  };
}

export async function saveSalesContact(
  input: SalesContact,
): Promise<SalesContact> {
  return apiPatch<SalesContact>("/admin/content/sales-contact", {
    whatsapp: input.whatsapp.trim(),
    phone: input.phone.trim(),
    email: input.email.trim(),
    message: input.message.trim(),
  });
}

export async function openWhatsApp(contact: SalesContact): Promise<void> {
  const digits = whatsappDigits(contact.whatsapp);
  if (!digits) {
    throw new Error("No hay un número de WhatsApp configurado.");
  }
  const text =
    contact.message.trim() ||
    "Hola, quiero información sobre una suscripción.";
  const url = `https://wa.me/${digits}?text=${encodeURIComponent(text)}`;
  const canOpen = await Linking.canOpenURL(url);
  if (!canOpen) {
    throw new Error("No se pudo abrir WhatsApp.");
  }
  await Linking.openURL(url);
}
