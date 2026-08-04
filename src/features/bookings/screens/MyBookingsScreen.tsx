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
import { useRouter } from "expo-router";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";
import {
  useCancelBooking,
  useMyBookings,
} from "@/features/bookings/hooks/useBookings";
import { prettyDateTime } from "@/utils/date";

export function MyBookingsScreen() {
  const router = useRouter();
  const { data, isLoading, isError } = useMyBookings();
  const cancelMutation = useCancelBooking();

  const onCancelBooking = (classId: string) => {
    Alert.alert("Cancel booking", "Remove this class from your bookings?", [
      { text: "Keep it", style: "cancel" },
      {
        text: "Cancel booking",
        style: "destructive",
        onPress: async () => {
          try {
            const result = await cancelMutation.mutateAsync(classId);
            Alert.alert("Cancelled", result.message);
          } catch (err) {
            Alert.alert("Error", (err as Error).message);
          }
        },
      },
    ]);
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
          <Text style={styles.heading}>Booking History</Text>
          <Text style={styles.subheading}>Your upcoming booked classes</Text>
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
          <Text style={styles.errorText}>Could not load bookings.</Text>
        </View>
      )}

      {!isLoading && !isError && (
        <FlatList
          data={data ?? []}
          keyExtractor={(item) => item.booking.id}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={styles.center}>
              <Text style={styles.emptyText}>No booked classes yet.</Text>
              <Text style={styles.emptyHint}>Go to Classes and book one!</Text>
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
                  <Text style={styles.statusText}>Booked</Text>
                </View>
                <Pressable
                  style={({ pressed }) => [
                    styles.cancelBtn,
                    (pressed || cancelMutation.isPending) && { opacity: 0.65 },
                  ]}
                  onPress={() => onCancelBooking(item.gymClass.id)}
                  disabled={cancelMutation.isPending}
                >
                  <Text style={styles.cancelBtnText}>Cancel</Text>
                </Pressable>
              </View>
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
  cancelBtnText: { color: "#f87171", fontSize: 12, fontWeight: "800" },
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
