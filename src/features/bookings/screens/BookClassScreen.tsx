import { useEffect, useMemo, useState } from "react";
import {
  View, Pressable, ScrollView, StyleSheet, StatusBar, Alert, ActivityIndicator } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter, useLocalSearchParams } from "expo-router";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useQuery } from "@tanstack/react-query";
import { Calendar, LocaleConfig } from "react-native-calendars";
import { queryKeys } from "@/constants/queryKeys";
import { AuthRequiredView } from "@/features/auth/components/AuthRequiredView";
import { useBookClass } from "@/features/bookings/hooks/useBookings";
import { useAuthState } from "@/features/auth/hooks/useAuthState";
import { fetchActiveLocations } from "@/features/locations/services/locationsService";
import {
  usePublicClassTemplate,
  usePublicClassTemplates,
} from "@/features/classes/hooks/useClasses";
import { BOOKING_ERROR_CODES } from "@/features/bookings/constants/bookingErrorCodes";
import { isApiErrorWithCode } from "@/services/api/client";
import { toDateKey } from "@/utils/date";
import { calendarSelectedMark, calendarTheme, colors, difficultyColor, fontStyle, withAlpha } from "@/theme";

import { Text } from "@/components/ui/Text";
LocaleConfig.locales.es = {
  monthNames: [
    "enero",
    "febrero",
    "marzo",
    "abril",
    "mayo",
    "junio",
    "julio",
    "agosto",
    "septiembre",
    "octubre",
    "noviembre",
    "diciembre",
  ],
  monthNamesShort: [
    "ene.",
    "feb.",
    "mar.",
    "abr.",
    "may.",
    "jun.",
    "jul.",
    "ago.",
    "sep.",
    "oct.",
    "nov.",
    "dic.",
  ],
  dayNames: [
    "domingo",
    "lunes",
    "martes",
    "miércoles",
    "jueves",
    "viernes",
    "sábado",
  ],
  dayNamesShort: ["dom.", "lun.", "mar.", "mié.", "jue.", "vie.", "sáb."],
  today: "Hoy",
};

LocaleConfig.defaultLocale = "es";

function parseDateKey(value: string): Date | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const [year, month, day] = value.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, day));
}

const WEEKDAY_SHORT = ["Dom", "Lun", "Mar", "Mie", "Jue", "Vie", "Sab"];

function dayInMask(mask: number, jsDay: number): boolean {
  return (mask & (1 << jsDay)) !== 0;
}

function formatWeekdays(mask: number): string {
  const days = Array.from({ length: 7 }, (_, d) => d).filter((d) =>
    dayInMask(mask, d),
  );
  if (days.length === 0) return "";

  const consecutive = days.every(
    (d, i) => i === 0 || d === days[i - 1] + 1,
  );
  if (consecutive && days.length > 1) {
    return `${WEEKDAY_SHORT[days[0]]} - ${WEEKDAY_SHORT[days[days.length - 1]]}`;
  }
  return days.map((d) => WEEKDAY_SHORT[d]).join(" + ");
}

function getDateAvailabilityReason(
  selectedDate: string,
  validFrom: string,
  validUntil: string | null,
  daysOfWeekMask: number,
): string | null {
  const date = parseDateKey(selectedDate);
  const from = parseDateKey(validFrom);
  const until = validUntil ? parseDateKey(validUntil) : null;

  if (!date || !from) {
    return "Selección de dia invalido.";
  }

  if (date < from) {
    return `Esta clase comienza a ${validFrom}.`;
  }

  if (until && date > until) {
    return `Esta clase esta disponible solo hasta el ${validUntil}.`;
  }

  const jsDay = date.getUTCDay();
  if (!dayInMask(daysOfWeekMask, jsDay)) {
    return "Esta clase no esta disponible para el día seleccionado.";
  }

  return null;
}

export function BookClassScreen() {
  const {
    className,
    classDate,
    templateId: initialTemplateId,
  } = useLocalSearchParams<{
    className?: string;
    classDate?: string;
    templateId?: string;
  }>();
  const router = useRouter();
  const { user } = useAuthState();
  const today = toDateKey(new Date());
  const [selectedDate, setSelectedDate] = useState(classDate ?? today);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(
    initialTemplateId ?? null,
  );
  const [selectedLocationId, setSelectedLocationId] = useState<string | null>(
    null,
  );

  const { data: templates, isLoading: isLoadingTemplates } =
    usePublicClassTemplates(Boolean(user));
  const selectedTemplateQuery = usePublicClassTemplate(
    selectedTemplateId ?? undefined,
  );
  const selectedTemplate =
    selectedTemplateQuery.data ??
    templates?.find((c) => c.id === selectedTemplateId) ??
    null;

  const locationsQuery = useQuery({
    queryKey: queryKeys.activeLocations,
    queryFn: fetchActiveLocations,
    enabled: Boolean(user),
  });
  const bookMutation = useBookClass();

  const selectedLocation =
    locationsQuery.data?.find((loc) => loc.id === selectedLocationId) ?? null;

  const dateReason = selectedTemplate
    ? getDateAvailabilityReason(
        selectedDate,
        selectedTemplate.valid_from,
        selectedTemplate.valid_until,
        selectedTemplate.days_of_week_mask,
      )
    : "Select a class first.";

  const disabledWeekDays = selectedTemplate
    ? Array.from({ length: 7 }, (_, d) => d).filter(
        (d) => !dayInMask(selectedTemplate.days_of_week_mask, d),
      )
    : [];

  const isDateValid = dateReason === null;
  const isReadyToBook = Boolean(selectedTemplateId && isDateValid);
  const isBookDisabled =
    !isReadyToBook ||
    locationsQuery.isLoading ||
    bookMutation.isPending ||
    selectedTemplateQuery.isLoading;

  const bookButtonLabel = locationsQuery.isLoading
    ? "Cargando ubicaciones..."
    : !selectedTemplateId
      ? "Selecciona una clase primero"
      : !isDateValid
        ? "Elije una fecha válida"
        : "Confirma Reserva";

  useEffect(() => {
    if (!locationsQuery.data?.length) {
      setSelectedLocationId(null);
      return;
    }

    const selectedStillAvailable = locationsQuery.data.some(
      (location) => location.id === selectedLocationId,
    );

    if (!selectedStillAvailable) {
      setSelectedLocationId(locationsQuery.data[0].id);
    }
  }, [locationsQuery.data, selectedLocationId]);

  if (!user) {
    return (
      <SafeAreaView style={s.root} edges={["top"]}>
        <StatusBar barStyle="light-content" backgroundColor={colors.background} />
        <AuthRequiredView
          title={"Inicia Sesión para Reservar"}
          subtitle="Crea una Cuenta o inicia sesión para reservar un lugar."
        />
      </SafeAreaView>
    );
  }

  const handleBook = async () => {
    if (!selectedTemplateId) {
      Alert.alert("Seleccionar una Clase", "Por favor Elige una Clase");
      return;
    }
    if (!selectedLocationId) {
      Alert.alert(
        "Selecciona una Ubicación",
        "Por Favor selecciona una Ubicación",
      );
      return;
    }
    if (!isDateValid) {
      Alert.alert(
        "Invalid date",
        dateReason ?? "Pick a valid date for this class.",
      );
      return;
    }

    try {
      const result = await bookMutation.mutateAsync({
        templateId: selectedTemplateId,
        requestedDate: selectedDate,
        locationId: selectedLocationId,
      });
      Alert.alert("Booked!", result.message, [
        { text: "Done", onPress: () => router.push("/") },
      ]);
    } catch (err) {
      const message = (err as Error).message;
      const hasCode = (code: string) => isApiErrorWithCode(err, code);
      const alreadyBooked =
        hasCode(BOOKING_ERROR_CODES.ALREADY_BOOKED) ||
        /already booked/i.test(message);

      if (alreadyBooked) {
        Alert.alert("Ya Reservado", "Ya reservaste esta clase.", [
          { text: "Aceptar" },
        ]);
        return;
      }

      if (hasCode(BOOKING_ERROR_CODES.CLASS_FULL)) {
        Alert.alert(
          "Clase llena",
          "Esta clase está llena. Por favor elige otra fecha o clase.",
          [{ text: "Aceptar" }],
        );
        return;
      }

      if (hasCode(BOOKING_ERROR_CODES.CLASS_INACTIVE)) {
        Alert.alert("Clase no disponible", "Esta clase ya no está activa.", [
          { text: "Aceptar" },
        ]);
        return;
      }

      if (hasCode(BOOKING_ERROR_CODES.CLASS_NOT_AVAILABLE_FOR_DATE)) {
        Alert.alert(
          "Fecha no disponible",
          "Esta clase no está disponible en la fecha seleccionada.",
          [{ text: "Aceptar" }],
        );
        return;
      }

      if (
        hasCode(BOOKING_ERROR_CODES.LOCATION_NOT_FOUND) ||
        hasCode(BOOKING_ERROR_CODES.LOCATION_ID_REQUIRED)
      ) {
        Alert.alert(
          "Ubicación no disponible",
          "Por favor selecciona una ubicación activa e inténtalo de nuevo.",
          [{ text: "Aceptar" }],
        );
        return;
      }

      if (hasCode(BOOKING_ERROR_CODES.CLASS_TEMPLATE_NOT_FOUND)) {
        Alert.alert(
          "Clase no disponible",
          "No se pudo encontrar esta clase. Por favor actualiza e inténtalo de nuevo.",
          [{ text: "Aceptar" }],
        );
        return;
      }

      if (hasCode(BOOKING_ERROR_CODES.BOOKING_TEMPORARILY_UNAVAILABLE)) {
        Alert.alert(
          "Reserva no disponible",
          "La reserva no está disponible temporalmente. Por favor inténtalo de nuevo en un momento.",
          [{ text: "Aceptar" }],
        );
        return;
      }

      Alert.alert("Error al reservar", message);
    }
  };

  const markedDates: Record<string, any> = {
    [selectedDate]: calendarSelectedMark(),
  };

  return (
    <SafeAreaView style={s.root} edges={["top"]}>
      <StatusBar barStyle="light-content" backgroundColor={colors.background} />

      <View style={s.header}>
        <Pressable style={s.backBtn} onPress={() => router.back()}>
          <MaterialCommunityIcons
            name="chevron-left"
            size={28}
            color={colors.accent.cyan}
          />
        </Pressable>
        <View style={{ flex: 1 }}>
          <Text variant="title" style={s.heading}>{className || "Reserva una clase"}</Text>
          <Text style={s.subHeading}>
            Elije Una Clase · Elige la Fecha · Confirma
          </Text>
        </View>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 120 }}
      >
        <View style={s.stepBlock}>
          <View style={s.stepRow}>
            <View style={s.stepNum}>
              <Text style={s.stepNumText}>1</Text>
            </View>
            <Text style={s.stepTitle}>Elije Una Clase</Text>
          </View>

          {isLoadingTemplates ? (
            <View style={s.loadingWrap}>
              <ActivityIndicator color={colors.accent.cyan} />
            </View>
          ) : !templates || templates.length === 0 ? (
            <View style={s.emptyWrap}>
              <Text style={{ fontSize: 32 }}>🤸</Text>
              <Text style={s.emptyText}>No hay clases disponibles</Text>
            </View>
          ) : (
            <View style={{ gap: 10 }}>
              {templates.map((c) => {
                const active = c.id === selectedTemplateId;
                const diffColor = difficultyColor(c.difficulty_level);
                const weekdays = formatWeekdays(c.days_of_week_mask);
                return (
                  <Pressable
                    key={c.id}
                    style={[s.classRow, active && s.classRowActive]}
                    onPress={() => setSelectedTemplateId(c.id)}
                  >
                    <View
                      style={[
                        s.classAccent,
                        { backgroundColor: active ? diffColor : colors.border },
                      ]}
                    />
                    <View style={{ flex: 1, paddingLeft: 14 }}>
                      <View
                        style={{
                          flexDirection: "row",
                          justifyContent: "space-between",
                        }}
                      >
                        <Text style={s.classTitle}>{c.title}</Text>
                        <Text style={s.classMeta}>{c.trainer_name} </Text>
                      </View>
                      <View
                        style={{
                          flexDirection: "row",
                          justifyContent: "space-between",
                        }}
                      >
                        <Text style={s.classMeta}>{c.start_time}</Text>
                        <Text style={s.classMeta}>{weekdays}</Text>
                      </View>
                    </View>
                    {active && <Text style={s.checkIcon}>✓</Text>}
                  </Pressable>
                );
              })}
            </View>
          )}
        </View>

        <View style={s.stepBlock}>
          <View style={s.stepRow}>
            <View style={s.stepNum}>
              <Text style={s.stepNumText}>2</Text>
            </View>
            <Text style={s.stepTitle}>Elige la Fecha</Text>
          </View>

          <Calendar
            current={selectedDate}
            onDayPress={(day) => {
              setSelectedDate(day.dateString);
            }}
            markedDates={markedDates}
            minDate={today}
            disabledByWeekDays={disabledWeekDays}
            theme={calendarTheme}
            style={s.calendar}
          />
          {!isDateValid && selectedTemplate ? (
            <Text style={s.dateErrorText}>{dateReason}</Text>
          ) : null}
        </View>

        {selectedTemplate && (
          <View style={s.summaryCard}>
            <Text style={s.summaryTitle}>Resumen de Reserva</Text>
            <View style={s.summaryRow}>
              <Text style={s.summaryLabel}>Clase</Text>
              <Text style={s.summaryValue}>{selectedTemplate.title}</Text>
            </View>
            <View style={s.summaryRow}>
              <Text style={s.summaryLabel}>Entrenador</Text>
              <Text style={s.summaryValue}>
                {selectedTemplate.trainer_name}
              </Text>
            </View>
            <View style={s.summaryRow}>
              <Text style={s.summaryLabel}>Fecha</Text>
              <Text style={s.summaryValue}>{selectedDate}</Text>
            </View>
            <View style={s.summaryRow}>
              <Text style={s.summaryLabel}>Hora</Text>
              <Text style={s.summaryValue}>{selectedTemplate.start_time}</Text>
            </View>
            <View style={[s.summaryRow, { borderBottomWidth: 0 }]}>
              <Text style={s.summaryLabel}>Ubicación</Text>
              <Text style={s.summaryValue}>
                {selectedLocation?.name ?? "-"}
              </Text>
            </View>
          </View>
        )}
      </ScrollView>

      <View style={s.floatingBar}>
        <Pressable
          style={({ pressed }) => [
            s.bookPressable,
            pressed && !isBookDisabled && s.bookPressablePressed,
          ]}
          onPress={handleBook}
          disabled={isBookDisabled}
        >
          <View
            style={[
              s.bookVisual,
              isReadyToBook ? s.bookVisualReady : s.bookVisualBlocked,
            ]}
          >
            {bookMutation.isPending ? (
              <ActivityIndicator color={isReadyToBook ? colors.inverse : colors.muted} />
            ) : (
              <View style={s.bookCtaContent}>
                <Text
                  style={[
                    s.bookCtaText,
                    !isReadyToBook && s.bookCtaTextBlocked,
                  ]}
                >
                  {bookButtonLabel}
                </Text>
                {isReadyToBook ? (
                  <MaterialCommunityIcons
                    name="arrow-right"
                    size={20}
                    color={colors.inverse}
                  />
                ) : null}
              </View>
            )}
          </View>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 14,
    gap: 12,
  },
  backBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: colors.surface.DEFAULT,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: "center",
    justifyContent: "center",
  },
  heading: { color: colors.foreground, fontSize: 20, fontWeight: "800", ...fontStyle.title },
  subHeading: { color: colors.muted, fontSize: 12, marginTop: 2 },
  stepBlock: { marginHorizontal: 20, marginTop: 24 },
  stepRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 14,
  },
  stepNum: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: colors.accent.cyan,
    alignItems: "center",
    justifyContent: "center",
  },
  stepNumText: { color: colors.inverse, fontSize: 13, fontWeight: "800" },
  stepTitle: { color: colors.foreground, fontSize: 16, fontWeight: "700" },
  calendar: {
    borderRadius: 16,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: colors.surface.elevated,
  },
  dateErrorText: {
    marginTop: 10,
    color: colors.danger,
    fontSize: 12,
  },
  loadingWrap: { paddingVertical: 32, alignItems: "center" },
  emptyWrap: { paddingVertical: 28, alignItems: "center", gap: 8 },
  emptyText: { color: colors.muted, fontSize: 14 },
  errorText: { color: colors.danger, fontSize: 14 },
  classRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.surface.DEFAULT,
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: colors.surface.elevated,
    position: "relative",
  },
  classRowActive: { borderColor: withAlpha(colors.accent.cyan, "44"), backgroundColor: withAlpha(colors.accent.cyan, "22") },
  classAccent: { width: 4, height: 42, borderRadius: 2 },
  classTitle: { color: colors.foreground, fontSize: 14, fontWeight: "700" },
  classMeta: { color: colors.muted, fontSize: 12, marginTop: 3 },
  checkIcon: {
    position: "absolute",
    top: 10,
    right: 12,
    color: colors.accent.cyan,
    fontSize: 16,
    fontWeight: "700",
  },
  locCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.surface.DEFAULT,
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.surface.elevated,
  },
  locCardActive: { borderColor: withAlpha(colors.accent.cyan, "44"), backgroundColor: withAlpha(colors.accent.cyan, "22") },
  locName: { color: colors.foreground, fontSize: 14, fontWeight: "700" },
  locAddr: { color: colors.muted, fontSize: 12, marginTop: 2 },
  locCheck: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: withAlpha(colors.accent.cyan, "22"),
    borderWidth: 1,
    borderColor: withAlpha(colors.accent.cyan, "44"),
    alignItems: "center",
    justifyContent: "center",
  },
  summaryCard: {
    marginHorizontal: 20,
    marginTop: 24,
    backgroundColor: colors.surface.DEFAULT,
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: colors.surface.elevated,
  },
  summaryTitle: {
    color: colors.foreground,
    fontSize: 15,
    fontWeight: "800",
    marginBottom: 14,
  },
  summaryRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: colors.surface.elevated,
  },
  summaryLabel: { color: colors.muted, fontSize: 13 },
  summaryValue: {
    color: colors.foreground,
    fontSize: 13,
    fontWeight: "600",
    maxWidth: "60%",
    textAlign: "right",
  },
  floatingBar: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    padding: 20,
    paddingBottom: 20,
    backgroundColor: colors.background,
    borderTopWidth: 1,
    borderTopColor: colors.surface.elevated,
  },
  bookPressable: {
    borderRadius: 18,
  },
  bookPressablePressed: { opacity: 0.85 },
  bookVisual: {
    height: 58,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
  },
  bookVisualReady: {
    backgroundColor: colors.foreground,
    borderColor: colors.foreground,
  },
  bookVisualBlocked: {
    backgroundColor: colors.surface.DEFAULT,
    borderColor: colors.border,
  },
  bookCtaContent: {
    alignItems: "center",
    flexDirection: "row",
    gap: 8,
    justifyContent: "center",
  },
  bookCtaText: { color: colors.inverse, fontSize: 16, fontWeight: "900" },
  bookCtaTextBlocked: { color: colors.muted },
});
