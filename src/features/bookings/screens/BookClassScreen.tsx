import { useEffect, useMemo, useState } from "react";
import {
  View,
  Text,
  Pressable,
  ScrollView,
  StyleSheet,
  StatusBar,
  Alert,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter, useLocalSearchParams } from "expo-router";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useQuery } from "@tanstack/react-query";
import { Calendar } from "react-native-calendars";
import { queryKeys } from "@/constants/queryKeys";
import { AuthRequiredView } from "@/features/auth/components/AuthRequiredView";
import { useBookClass } from "@/features/bookings/hooks/useBookings";
import { useAuthState } from "@/features/auth/hooks/useAuthState";
import { fetchActiveLocations } from "@/features/locations/services/locationsService";
import { usePublicClassTemplate, usePublicClassTemplates } from "@/features/classes/hooks/useClasses";
import { BOOKING_ERROR_CODES } from "@/features/bookings/constants/bookingErrorCodes";
import { isApiErrorWithCode } from "@/services/api/client";
import { toDateKey } from "@/utils/date";

const DIFF_COLORS: Record<string, string> = {
  beginner: "#22D3EE",
  intermediate: "#F59E0B",
  advanced: "#A855F7",
};

function parseDateKey(value: string): Date | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const [year, month, day] = value.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, day));
}

function dayInMask(mask: number, jsDay: number): boolean {
  return (mask & (1 << jsDay)) !== 0;
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
    return "Invalid date selected.";
  }

  if (date < from) {
    return `This class starts on ${validFrom}.`;
  }

  if (until && date > until) {
    return `This class is available only until ${validUntil}.`;
  }

  const jsDay = date.getUTCDay();
  if (!dayInMask(daysOfWeekMask, jsDay)) {
    return "This class does not run on the selected weekday.";
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

  const { data: templates, isLoading: isLoadingTemplates } = usePublicClassTemplates(Boolean(user));
  const selectedTemplateQuery = usePublicClassTemplate(selectedTemplateId ?? undefined);
  const selectedTemplate = selectedTemplateQuery.data ?? templates?.find((c) => c.id === selectedTemplateId) ?? null;

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

  const isDateValid = dateReason === null;
  const isReadyToBook = Boolean(selectedTemplateId && isDateValid);
  const isBookDisabled =
    !isReadyToBook ||
    locationsQuery.isLoading ||
    bookMutation.isPending ||
    selectedTemplateQuery.isLoading;

  const bookButtonLabel = locationsQuery.isLoading
    ? "Loading locations..."
    : !selectedTemplateId
      ? "Select a class first"
        : !isDateValid
          ? "Pick a valid date"
          : "Confirm Booking";

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
        <StatusBar barStyle="light-content" backgroundColor="#0A0A0A" />
        <AuthRequiredView
          title={"Sign in to book\na class"}
          subtitle="Create an account or sign in to reserve a spot."
        />
      </SafeAreaView>
    );
  }

  const handleBook = async () => {
    if (!selectedTemplateId) {
      Alert.alert("Select a class", "Please select a class to book");
      return;
    }
    if (!selectedLocationId) {
      Alert.alert("Select a location", "Please select a location to book");
      return;
    }
    if (!isDateValid) {
      Alert.alert("Invalid date", dateReason ?? "Pick a valid date for this class.");
      return;
    }

    try {
      const result = await bookMutation.mutateAsync({
        templateId: selectedTemplateId,
        requestedDate: selectedDate,
        locationId: selectedLocationId,
      });
      Alert.alert("Booked!", result.message, [
        { text: "Done", onPress: () => router.back() },
      ]);
    } catch (err) {
      const message = (err as Error).message;
      const hasCode = (code: string) => isApiErrorWithCode(err, code);
      const alreadyBooked = hasCode(BOOKING_ERROR_CODES.ALREADY_BOOKED) || /already booked/i.test(message);

      if (alreadyBooked) {
        Alert.alert("Already booked", "You already booked this class.", [{ text: "Accept" }]);
        return;
      }

      if (hasCode(BOOKING_ERROR_CODES.CLASS_FULL)) {
        Alert.alert("Class full", "This class is full. Please choose another date or class.", [{ text: "Accept" }]);
        return;
      }

      if (hasCode(BOOKING_ERROR_CODES.CLASS_INACTIVE)) {
        Alert.alert("Class unavailable", "This class is no longer active.", [{ text: "Accept" }]);
        return;
      }

      if (hasCode(BOOKING_ERROR_CODES.CLASS_NOT_AVAILABLE_FOR_DATE)) {
        Alert.alert("Date unavailable", "This class is not available on the selected date.", [{ text: "Accept" }]);
        return;
      }

      if (
        hasCode(BOOKING_ERROR_CODES.LOCATION_NOT_FOUND) ||
        hasCode(BOOKING_ERROR_CODES.LOCATION_ID_REQUIRED)
      ) {
        Alert.alert("Location unavailable", "Please select an active location and try again.", [{ text: "Accept" }]);
        return;
      }

      if (hasCode(BOOKING_ERROR_CODES.CLASS_TEMPLATE_NOT_FOUND)) {
        Alert.alert("Class unavailable", "This class could not be found. Please refresh and try again.", [{ text: "Accept" }]);
        return;
      }

      if (hasCode(BOOKING_ERROR_CODES.BOOKING_TEMPORARILY_UNAVAILABLE)) {
        Alert.alert("Booking unavailable", "Booking is temporarily unavailable. Please try again in a moment.", [{ text: "Accept" }]);
        return;
      }

      Alert.alert("Booking failed", message);
    }
  };

  const markedDates: Record<string, any> = {
    [selectedDate]: {
      selected: true,
      selectedColor: "#22D3EE",
      selectedTextColor: "#000",
    },
  };

  return (
    <SafeAreaView style={s.root} edges={["top"]}>
      <StatusBar barStyle="light-content" backgroundColor="#0A0A0A" />

      <View style={s.header}>
        <Pressable style={s.backBtn} onPress={() => router.back()}>
          <MaterialCommunityIcons
            name="chevron-left"
            size={28}
            color="#22D3EE"
          />
        </Pressable>
        <View style={{ flex: 1 }}>
          <Text style={s.heading}>{className || "Book a Class"}</Text>
          <Text style={s.subHeading}>Elije Una Clase · Elige la Fecha · Confirma</Text>
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
              <ActivityIndicator color="#22D3EE" />
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
                const diffColor = DIFF_COLORS[c.difficulty_level] ?? "#22D3EE";
                const weekdays = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]
                  .filter((_, day) => (c.days_of_week_mask & (1 << day)) !== 0)
                  .join(" + ");
                return (
                  <Pressable
                    key={c.id}
                    style={[s.classRow, active && s.classRowActive]}
                    onPress={() => setSelectedTemplateId(c.id)}
                  >
                    <View
                      style={[
                        s.classAccent,
                        { backgroundColor: active ? diffColor : "#2A2A2A" },
                      ]}
                    />
                    <View style={{ flex: 1, paddingLeft: 14 }}>
                      <Text style={s.classTitle}>{c.title}</Text>
                      <Text style={s.classMeta}>
                        {c.trainer_name} · {c.start_time} · {weekdays}
                      </Text>
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
            theme={{
              calendarBackground: "#141414",
              backgroundColor: "#141414",
              dayTextColor: "#DDD",
              textDisabledColor: "#333",
              selectedDayBackgroundColor: "#22D3EE",
              selectedDayTextColor: "#000",
              todayTextColor: "#22D3EE",
              monthTextColor: "#FFF",
              arrowColor: "#22D3EE",
              textMonthFontWeight: "800",
              textDayFontSize: 14,
              textMonthFontSize: 16,
              dotColor: "#22D3EE",
              selectedDotColor: "#000",
            }}
            style={s.calendar}
          />
          {!isDateValid && selectedTemplate ? (
            <Text style={s.dateErrorText}>{dateReason}</Text>
          ) : null}
        </View>

        {/* <View style={s.stepBlock}>
          <View style={s.stepRow}>
            <View style={s.stepNum}>
              <Text style={s.stepNumText}>3</Text>
            </View>
            <Text style={s.stepTitle}>Elige la Ubicación</Text>
          </View>

          {locationsQuery.isLoading ? (
            <View style={s.loadingWrap}>
              <ActivityIndicator color="#22D3EE" />
            </View>
          ) : locationsQuery.isError ? (
            <View style={s.emptyWrap}>
              <Text style={s.errorText}>No se pudieron cargar las ubicaciones.</Text>
            </View>
          ) : !locationsQuery.data || locationsQuery.data.length === 0 ? (
            <View style={s.emptyWrap}>
              <Text style={{ fontSize: 32 }}>📍</Text>
              <Text style={s.emptyText}>No active locations available</Text>
            </View>
          ) : (
            <View style={{ gap: 10 }}>
              {locationsQuery.data.map((loc) => {
                const active = loc.id === selectedLocationId;
                return (
                  <Pressable
                    key={loc.id}
                    style={[s.locCard, active && s.locCardActive]}
                    onPress={() => setSelectedLocationId(loc.id)}
                  >
                    <MaterialCommunityIcons
                      name="map-marker-radius"
                      size={26}
                      color={active ? "#22D3EE" : "#666666"}
                    />
                    <View style={{ flex: 1, marginLeft: 12 }}>
                      <Text style={s.locName}>{loc.name}</Text>
                      <Text style={s.locAddr}>
                        {loc.address || "No address provided"}
                      </Text>
                    </View>
                    {active && (
                      <View style={s.locCheck}>
                        <Text style={{ color: "#22D3EE", fontSize: 14 }}>
                          ✓
                        </Text>
                      </View>
                    )}
                  </Pressable>
                );
              })}
            </View>
          )}
        </View> */}

        {selectedTemplate && (
          <View style={s.summaryCard}>
            <Text style={s.summaryTitle}>Booking Summary</Text>
            <View style={s.summaryRow}>
              <Text style={s.summaryLabel}>Class</Text>
              <Text style={s.summaryValue}>{selectedTemplate.title}</Text>
            </View>
            <View style={s.summaryRow}>
              <Text style={s.summaryLabel}>Trainer</Text>
              <Text style={s.summaryValue}>{selectedTemplate.trainer_name}</Text>
            </View>
            <View style={s.summaryRow}>
              <Text style={s.summaryLabel}>Date</Text>
              <Text style={s.summaryValue}>{selectedDate}</Text>
            </View>
            <View style={s.summaryRow}>
              <Text style={s.summaryLabel}>Time</Text>
              <Text style={s.summaryValue}>{selectedTemplate.start_time}</Text>
            </View>
            <View style={[s.summaryRow, { borderBottomWidth: 0 }]}>
              <Text style={s.summaryLabel}>Location</Text>
              <Text style={s.summaryValue}>{selectedLocation?.name ?? "-"}</Text>
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
              <ActivityIndicator color={isReadyToBook ? "#000" : "#777"} />
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
                    color="#000"
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
  root: { flex: 1, backgroundColor: "#0A0A0A" },
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
    backgroundColor: "#141414",
    borderWidth: 1,
    borderColor: "#222222",
    alignItems: "center",
    justifyContent: "center",
  },
  heading: { color: "#FFF", fontSize: 20, fontWeight: "800" },
  subHeading: { color: "#555", fontSize: 12, marginTop: 2 },
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
    backgroundColor: "#22D3EE",
    alignItems: "center",
    justifyContent: "center",
  },
  stepNumText: { color: "#000", fontSize: 13, fontWeight: "800" },
  stepTitle: { color: "#FFF", fontSize: 16, fontWeight: "700" },
  calendar: {
    borderRadius: 16,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "#1E1E1E",
  },
  dateErrorText: {
    marginTop: 10,
    color: "#fca5a5",
    fontSize: 12,
  },
  loadingWrap: { paddingVertical: 32, alignItems: "center" },
  emptyWrap: { paddingVertical: 28, alignItems: "center", gap: 8 },
  emptyText: { color: "#555", fontSize: 14 },
  errorText: { color: "#f87171", fontSize: 14 },
  classRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#141414",
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: "#1E1E1E",
    position: "relative",
  },
  classRowActive: { borderColor: "#22D3EE44", backgroundColor: "#0F2A2E" },
  classAccent: { width: 4, height: 42, borderRadius: 2 },
  classTitle: { color: "#FFF", fontSize: 14, fontWeight: "700" },
  classMeta: { color: "#666", fontSize: 12, marginTop: 3 },
  checkIcon: {
    position: "absolute",
    top: 10,
    right: 12,
    color: "#22D3EE",
    fontSize: 16,
    fontWeight: "700",
  },
  locCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#141414",
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: "#1E1E1E",
  },
  locCardActive: { borderColor: "#22D3EE44", backgroundColor: "#0F2A2E" },
  locName: { color: "#FFF", fontSize: 14, fontWeight: "700" },
  locAddr: { color: "#666", fontSize: 12, marginTop: 2 },
  locCheck: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "#22D3EE22",
    borderWidth: 1,
    borderColor: "#22D3EE44",
    alignItems: "center",
    justifyContent: "center",
  },
  summaryCard: {
    marginHorizontal: 20,
    marginTop: 24,
    backgroundColor: "#141414",
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: "#1E1E1E",
  },
  summaryTitle: {
    color: "#FFF",
    fontSize: 15,
    fontWeight: "800",
    marginBottom: 14,
  },
  summaryRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#1E1E1E",
  },
  summaryLabel: { color: "#555", fontSize: 13 },
  summaryValue: {
    color: "#FFF",
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
    backgroundColor: "#0A0A0A",
    borderTopWidth: 1,
    borderTopColor: "#1A1A1A",
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
    backgroundColor: "#FFFFFF",
    borderColor: "#FFFFFF",
  },
  bookVisualBlocked: {
    backgroundColor: "#141414",
    borderColor: "#2A2A2A",
  },
  bookCtaContent: {
    alignItems: "center",
    flexDirection: "row",
    gap: 8,
    justifyContent: "center",
  },
  bookCtaText: { color: "#000", fontSize: 16, fontWeight: "900" },
  bookCtaTextBlocked: { color: "#9CA3AF" },
});
