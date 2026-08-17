import {
  View,
  Text,
  FlatList,
  Pressable,
  ActivityIndicator,
  Alert,
  StyleSheet,
  StatusBar,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";
import { useMemo } from "react";
import {
  useCancelBooking,
  useMyBookings,
} from "@/features/bookings/hooks/useBookings";
import { prettyDateTime } from "@/utils/date";

type BookingsFilter = "all" | "week" | "day";

export function MyBookingsScreen() {
  const router = useRouter();
  const { filter, date } = useLocalSearchParams<{
    filter?: string;
    date?: string;
  }>();
  const { data, isLoading, isError } = useMyBookings();
  const cancelMutation = useCancelBooking();

  const activeFilter: BookingsFilter =
    filter === "week" || filter === "day" ? filter : "all";
  const targetDate =
    date && /^\d{4}-\d{2}-\d{2}$/.test(date) ? date : null;

  const filteredBookings = useMemo(() => {
    const bookings = data ?? [];
    if (targetDate) {
      return bookings.filter((item) => item.gymClass.date === targetDate);
    }
    if (activeFilter === "all") {
      return bookings;
    }

    const today = new Date();
    const todayKey = `${today.getUTCFullYear()}-${String(today.getUTCMonth() + 1).padStart(2, "0")}-${String(
      today.getUTCDate(),
    ).padStart(2, "0")}`;

    if (activeFilter === "day") {
      return bookings.filter((item) => item.gymClass.date === todayKey);
    }

    const currentDay = today.getUTCDay();
    const weekStart = new Date(
      Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate()),
    );
    weekStart.setUTCDate(
      weekStart.getUTCDate() - (currentDay === 0 ? 6 : currentDay - 1),
    );
    const weekEnd = new Date(weekStart);
    weekEnd.setUTCDate(weekStart.getUTCDate() + 6);

    return bookings.filter((item) => {
      if (!/^\d{4}-\d{2}-\d{2}$/.test(item.gymClass.date)) return false;
      const classDate = new Date(`${item.gymClass.date}T00:00:00Z`);
      return classDate >= weekStart && classDate <= weekEnd;
    });
  }, [activeFilter, targetDate, data]);

  const subheading = targetDate
    ? `Tus clases reservadas para el ${new Date(
        `${targetDate}T00:00:00`,
      ).toDateString()}`
    : activeFilter === "week"
      ? "Tus clases reservadas de esta semana"
      : activeFilter === "day"
        ? "Tus clases reservadas para hoy"
        : "Tus próximas clases reservadas";

  const onCancelBooking = (classId: string) => {
    Alert.alert("Cancelar Clase", "¿Eliminar esta clase de tus reservas?", [
      { text: "Mantener", style: "cancel" },
      {
        text: "Cancelar reserva",
        style: "destructive",
        onPress: async () => {
          try {
            const result = await cancelMutation.mutateAsync(classId);
            Alert.alert("Cancelada", result.message);
          } catch (err) {
            Alert.alert("Error", (err as Error).message);
          }
        },
      },
    ]);
  };

  const cancellationWindowLabel = (hours: number) => {
    const trimmed = Number(hours.toFixed(1));
    return trimmed === 1 ? "1 hora" : `${trimmed} horas`;
  };

  return (
    <SafeAreaView style={styles.root}>
      <StatusBar barStyle="light-content" backgroundColor="#000000" />

      <View style={styles.header}>
        <Pressable
          style={({ pressed }) => [
            styles.backBtn,
            pressed && { opacity: 0.75 },
          ]}
          onPress={() => router.back()}
        >
          <MaterialCommunityIcons
            name="chevron-left"
            size={28}
            color="#22D3EE"
          />
        </Pressable>
        <View style={{ flex: 1 }}>
          <Text style={styles.heading}>Mis Classes Reservadas</Text>
          <Text style={styles.subheading}>{subheading}</Text>
        </View>
      </View>

      <View style={styles.divider} />

      {isLoading && (
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#22D3EE" />
        </View>
      )}

      {isError && (
        <View style={styles.center}>
          <Text style={styles.errorText}>No se pudieron cargar las reservas.</Text>
        </View>
      )}

      {!isLoading && !isError && (
        <FlatList
          data={filteredBookings}
          keyExtractor={(item) => item.booking.id}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={styles.center}>
              <Text style={styles.emptyText}>Aún no hay clases reservadas.</Text>
              <Text style={styles.emptyHint}>¡Ve a Clases y reserva una!</Text>
            </View>
          }
          renderItem={({ item }) => (
            <View style={styles.card}>
              <View style={styles.cardTopRow}>
                <View style={styles.cardTitleWrap}>
                  <Text style={styles.cardTitle}>{item.gymClass.title}</Text>
                  <Text style={styles.cardTrainer}>
                    {item.gymClass.trainer_name}
                  </Text>
                  <Text style={styles.cardLocation}>
                    {item.booking.location_name ?? item.gymClass.location}
                  </Text>
                  {item.booking.location_address ? (
                    <Text style={styles.cardLocationAddress}>
                      {item.booking.location_address}
                    </Text>
                  ) : null}
                </View>
                <Text style={styles.cardTime}>
                  {prettyDateTime(
                    item.gymClass.date,
                    item.gymClass.start_time,
                    item.gymClass.end_time,
                  )}
                </Text>
              </View>
              <View style={styles.cardFooter}>
                <View style={styles.statusBadge}>
                  <Text style={styles.statusText}>Reservada</Text>
                </View>
                <Pressable
                  style={({ pressed }) => [
                    styles.cancelBtn,
                    (pressed || cancelMutation.isPending) && { opacity: 0.65 },
                    !item.cancellable && styles.cancelBtnDisabled,
                  ]}
                  onPress={() => onCancelBooking(item.gymClass.id)}
                  disabled={cancelMutation.isPending || !item.cancellable}
                >
                  <Text
                    style={[
                      styles.cancelBtnText,
                      !item.cancellable && styles.cancelBtnTextDisabled,
                    ]}
                  >
                    Cancelar
                  </Text>
                </Pressable>
              </View>
              {!item.cancellable && (
                <View style={styles.notCancellableWrap}>
                  <Text style={styles.notCancellableText}>
                    Clase no cancelable, estás dentro de las{" "}
                    {cancellationWindowLabel(item.cancellationWindowHours)} de
                    iniciar
                  </Text>
                </View>
              )}
            </View>
          )}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#000000" },
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
  heading: { fontSize: 24, fontWeight: "900", color: "#ffffff" },
  subheading: { color: "#666666", fontSize: 14, marginTop: 4 },
  divider: { height: 1, backgroundColor: "#1c1c1c", marginHorizontal: 16 },
  list: { paddingHorizontal: 16, paddingTop: 16, paddingBottom: 32 },
  card: {
    backgroundColor: "#111111",
    borderRadius: 18,
    padding: 18,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#222222",
  },
  cardTopRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 14,
  },
  cardTitleWrap: { flex: 1 },
  cardTitle: { fontSize: 17, fontWeight: "800", color: "#ffffff" },
  cardTrainer: { fontSize: 13, color: "#777777", marginTop: 4 },
  cardLocation: { fontSize: 13, color: "#22D3EE", marginTop: 8 },
  cardLocationAddress: { fontSize: 12, color: "#555555", marginTop: 2 },
  cardTime: {
    color: "#9CA3AF",
    flexShrink: 1,
    fontSize: 12,
    fontWeight: "600",
    lineHeight: 18,
    maxWidth: 150,
    textAlign: "right",
  },
  cardFooter: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 18,
  },
  statusBadge: {
    alignSelf: "flex-start",
    backgroundColor: "#052e16",
    borderColor: "#22C55E44",
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 5,
  },
  statusText: { fontSize: 12, fontWeight: "800", color: "#22C55E" },
  cancelBtn: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "#EF444455",
    backgroundColor: "#EF444411",
    paddingHorizontal: 14,
    paddingVertical: 7,
  },
  cancelBtnDisabled: {
    borderColor: "#3f3f3f",
    backgroundColor: "#181818",
  },
  cancelBtnText: { color: "#f87171", fontSize: 12, fontWeight: "800" },
  cancelBtnTextDisabled: { color: "#555555" },
  notCancellableWrap: {
    marginTop: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#F59E0B33",
    backgroundColor: "#F59E0B11",
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  notCancellableText: {
    color: "#FBBF24",
    fontSize: 12,
    fontWeight: "600",
    lineHeight: 17,
  },
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 60,
  },
  errorText: { color: "#f87171", fontSize: 15 },
  emptyText: { color: "#555555", fontSize: 15, fontWeight: "600" },
  emptyHint: { color: "#333333", fontSize: 13, marginTop: 6 },
});
