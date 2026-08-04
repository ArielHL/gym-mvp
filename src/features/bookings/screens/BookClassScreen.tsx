import { useEffect, useState } from "react";
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
import { useClasses } from "@/features/classes/hooks/useClasses";
import { useBookClass } from "@/features/bookings/hooks/useBookings";
import { useAuthState } from "@/features/auth/hooks/useAuthState";
import { fetchActiveLocations } from "@/features/locations/services/locationsService";
import { toDateKey } from "@/utils/date";

const DIFF_COLORS: Record<string, string> = {
  beginner: "#22D3EE",
  intermediate: "#F59E0B",
  advanced: "#A855F7",
};

export function BookClassScreen() {
  const {
    className,
    classDate,
    classId: initialClassId,
  } = useLocalSearchParams<{
    className?: string;
    classDate?: string;
    classId?: string;
  }>();
  const router = useRouter();
  const { user } = useAuthState();
  const today = toDateKey(new Date());
  const [selectedDate, setSelectedDate] = useState(classDate ?? today);
  const [selectedClassId, setSelectedClassId] = useState<string | null>(
    initialClassId ?? null,
  );
  const [selectedLocationId, setSelectedLocationId] = useState<string | null>(
    null,
  );

  const { data: classes, isLoading } = useClasses(selectedDate, Boolean(user));
  const locationsQuery = useQuery({
    queryKey: queryKeys.activeLocations,
    queryFn: fetchActiveLocations,
    enabled: Boolean(user),
  });
  const bookMutation = useBookClass();

  const selectedClass = classes?.find((c) => c.id === selectedClassId) ?? null;
  const selectedLocation =
    locationsQuery.data?.find((loc) => loc.id === selectedLocationId) ?? null;
  const isReadyToBook = Boolean(selectedClassId && selectedLocationId);
  const isBookDisabled =
    !isReadyToBook || locationsQuery.isLoading || bookMutation.isPending;
  const bookButtonLabel = locationsQuery.isLoading
    ? "Loading locations..."
    : !selectedClassId
      ? "Select a class first"
      : !selectedLocationId
        ? "Select a location first"
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
    if (!user) {
      Alert.alert("Sign in required", "Please sign in to book a class", [
        { text: "Cancel", style: "cancel" },
        { text: "Sign In", onPress: () => router.push("/auth") },
      ]);
      return;
    }
    if (!selectedClassId) {
      Alert.alert("Select a class", "Please select a class to book");
      return;
    }
    if (!selectedLocationId) {
      Alert.alert("Select a location", "Please select a location to book");
      return;
    }
    try {
      const result = await bookMutation.mutateAsync({
        classId: selectedClassId,
        locationId: selectedLocationId,
      });
      Alert.alert("Booked!", result.message, [
        { text: "Done", onPress: () => router.back() },
      ]);
    } catch (err) {
      Alert.alert("Booking failed", (err as Error).message);
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

      {/* Header */}
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
          <Text style={s.subHeading}>Pick date · Choose class · Confirm</Text>
        </View>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 120 }}
      >
        {/* ── Step 1: Pick Date ── */}
        <View style={s.stepBlock}>
          <View style={s.stepRow}>
            <View style={s.stepNum}>
              <Text style={s.stepNumText}>1</Text>
            </View>
            <Text style={s.stepTitle}>Pick a Date</Text>
          </View>

          <Calendar
            current={selectedDate}
            onDayPress={(day) => {
              setSelectedDate(day.dateString);
              setSelectedClassId(null);
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
        </View>

        {/* ── Step 2: Choose Class ── */}
        <View style={s.stepBlock}>
          <View style={s.stepRow}>
            <View style={s.stepNum}>
              <Text style={s.stepNumText}>2</Text>
            </View>
            <Text style={s.stepTitle}>Choose a Class</Text>
          </View>

          {isLoading ? (
            <View style={s.loadingWrap}>
              <ActivityIndicator color="#22D3EE" />
            </View>
          ) : !classes || classes.length === 0 ? (
            <View style={s.emptyWrap}>
              <Text style={{ fontSize: 32 }}>🤸</Text>
              <Text style={s.emptyText}>No classes on this date</Text>
            </View>
          ) : (
            <View style={{ gap: 10 }}>
              {classes.map((c) => {
                const active = c.id === selectedClassId;
                const full = c.available_spots <= 0;
                const diffColor = DIFF_COLORS[c.difficulty_level] ?? "#22D3EE";
                return (
                  <Pressable
                    key={c.id}
                    style={[
                      s.classRow,
                      active && s.classRowActive,
                      full && s.classRowFull,
                    ]}
                    onPress={() => !full && setSelectedClassId(c.id)}
                  >
                    <View
                      style={[
                        s.classAccent,
                        { backgroundColor: active ? diffColor : "#2A2A2A" },
                      ]}
                    />
                    <View style={{ flex: 1, paddingLeft: 14 }}>
                      <Text style={[s.classTitle, full && { color: "#444" }]}>
                        {c.title}
                      </Text>
                      <Text style={s.classMeta}>
                        {c.trainer_name} · {c.start_time} – {c.end_time}
                      </Text>
                    </View>
                    <View style={{ alignItems: "flex-end", gap: 4 }}>
                      {full ? (
                        <Text style={s.fullTag}>FULL</Text>
                      ) : (
                        <>
                          <View
                            style={[
                              s.diffTag,
                              {
                                backgroundColor: diffColor + "22",
                                borderColor: diffColor + "55",
                              },
                            ]}
                          >
                            <Text style={[s.diffTagText, { color: diffColor }]}>
                              {c.difficulty_level.slice(0, 3).toUpperCase()}
                            </Text>
                          </View>
                          <Text style={s.spotsTag}>
                            {c.available_spots} spots
                          </Text>
                        </>
                      )}
                    </View>
                    {active && <Text style={s.checkIcon}>✓</Text>}
                  </Pressable>
                );
              })}
            </View>
          )}
        </View>

        {/* ── Step 3: Location ── */}
        <View style={s.stepBlock}>
          <View style={s.stepRow}>
            <View style={s.stepNum}>
              <Text style={s.stepNumText}>3</Text>
            </View>
            <Text style={s.stepTitle}>Select Location</Text>
          </View>

          {locationsQuery.isLoading ? (
            <View style={s.loadingWrap}>
              <ActivityIndicator color="#22D3EE" />
            </View>
          ) : locationsQuery.isError ? (
            <View style={s.emptyWrap}>
              <Text style={s.errorText}>Could not load locations.</Text>
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
        </View>

        {/* ── Class Summary ── */}
        {selectedClass && (
          <View style={s.summaryCard}>
            <Text style={s.summaryTitle}>Booking Summary</Text>
            <View style={s.summaryRow}>
              <Text style={s.summaryLabel}>Class</Text>
              <Text style={s.summaryValue}>{selectedClass.title}</Text>
            </View>
            <View style={s.summaryRow}>
              <Text style={s.summaryLabel}>Trainer</Text>
              <Text style={s.summaryValue}>{selectedClass.trainer_name}</Text>
            </View>
            <View style={s.summaryRow}>
              <Text style={s.summaryLabel}>Date</Text>
              <Text style={s.summaryValue}>{selectedDate}</Text>
            </View>
            <View style={s.summaryRow}>
              <Text style={s.summaryLabel}>Time</Text>
              <Text style={s.summaryValue}>
                {selectedClass.start_time} – {selectedClass.end_time}
              </Text>
            </View>
            <View style={s.summaryRow}>
              <Text style={s.summaryLabel}>Duration</Text>
              <Text style={s.summaryValue}>
                {selectedClass.duration_minutes} min
              </Text>
            </View>
            <View style={[s.summaryRow, { borderBottomWidth: 0 }]}>
              <Text style={s.summaryLabel}>Location</Text>
              <Text style={s.summaryValue}>
                {selectedLocation?.name ?? "-"}
              </Text>
            </View>
          </View>
        )}
      </ScrollView>

      {/* ── Floating Book Button ── */}
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
  classRowFull: { opacity: 0.5 },
  classAccent: { width: 4, height: 42, borderRadius: 2 },
  classTitle: { color: "#FFF", fontSize: 14, fontWeight: "700" },
  classMeta: { color: "#666", fontSize: 12, marginTop: 3 },
  fullTag: {
    color: "#EF4444",
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 1,
  },
  diffTag: {
    borderWidth: 1,
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  diffTagText: { fontSize: 10, fontWeight: "800", letterSpacing: 0.5 },
  spotsTag: { color: "#555", fontSize: 11 },
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
