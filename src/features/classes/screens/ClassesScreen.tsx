import { useMemo, useState } from "react";
import {
  View,
  Text,
  Pressable,
  FlatList,
  ActivityIndicator,
  StyleSheet,
  StatusBar,
  Image,
  TextInput,
  Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import type { GymClass } from "@/types/models";
import {
  useCancelBooking,
  useMyBookings,
} from "@/features/bookings/hooks/useBookings";
import { useAuthState } from "@/features/auth/hooks/useAuthState";
import { useClasses } from "@/features/classes/hooks/useClasses";

const DIFF_COLORS: Record<string, string> = {
  beginner: "#22D3EE",
  intermediate: "#F59E0B",
  advanced: "#A855F7",
};

const CLASS_IMAGES: Record<string, string> = {
  default:
    "https://images.unsplash.com/photo-1571019614242-c5c5dee9f50b?w=400&q=70",
  strength:
    "https://images.unsplash.com/photo-1526506118085-60ce8714f8c5?w=400&q=70",
  cardio:
    "https://images.unsplash.com/photo-1517963879433-6ad2171073fb?w=400&q=70",
  yoga: "https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?w=400&q=70",
  mobility:
    "https://images.unsplash.com/photo-1599058917765-a780eda07a3e?w=400&q=70",
};

const FILTERS = ["All", "Beginner", "Intermediate", "Advanced"];
const DAY_FILTERS = [
  { label: "All", value: null },
  { label: "Sun", value: 0 },
  { label: "Mon", value: 1 },
  { label: "Tue", value: 2 },
  { label: "Wed", value: 3 },
  { label: "Thu", value: 4 },
  { label: "Fri", value: 5 },
  { label: "Sat", value: 6 },
] as const;

function formatDateShort(dateStr: string): string {
  const d = new Date(dateStr + "T00:00:00");
  return d.toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}

interface ClassCardProps {
  item: GymClass;
  isBooked: boolean;
  isActionDisabled: boolean;
  onPress: () => void;
  onBookPress: () => void;
  onCancelPress: () => void;
}

function ClassCard({
  item,
  isBooked,
  isActionDisabled,
  onPress,
  onBookPress,
  onCancelPress,
}: ClassCardProps) {
  const full = item.available_spots <= 0;
  const diffColor = DIFF_COLORS[item.difficulty_level] ?? "#22D3EE";
  const typeKey = item.exercise_type?.toLowerCase() ?? "default";
  const imgUri = CLASS_IMAGES[typeKey] ?? CLASS_IMAGES.default;
  const showAction = isBooked || !full;

  return (
    <Pressable
      style={({ pressed }) => [s.card, pressed && { opacity: 0.8 }]}
      onPress={onPress}
    >
      {/* Image */}
      <View style={s.cardImgWrap}>
        <Image source={{ uri: imgUri }} style={s.cardImg} resizeMode="cover" />
        <View style={s.cardImgOverlay} />
        <View
          style={[
            s.diffPill,
            {
              backgroundColor: diffColor + "22",
              borderColor: diffColor + "66",
            },
          ]}
        >
          <Text style={[s.diffPillText, { color: diffColor }]}>
            {item.difficulty_level.toUpperCase()}
          </Text>
        </View>
        {full && (
          <View style={s.fullBanner}>
            <Text style={s.fullBannerText}>FULL</Text>
          </View>
        )}
      </View>

      {/* Body */}
      <View style={s.cardBody}>
        <Text style={s.cardTitle} numberOfLines={2}>
          {item.title}
        </Text>
        <Text style={s.cardTrainer}>🏋️ {item.trainer_name}</Text>

        <View style={s.cardMeta}>
          <View style={s.metaItem}>
            <Text style={s.metaIcon}>📅</Text>
            <Text style={s.metaText}>{formatDateShort(item.date)}</Text>
          </View>
          <View style={s.metaItem}>
            <Text style={s.metaIcon}>⏱</Text>
            <Text style={s.metaText}>{item.start_time}</Text>
          </View>
          <View style={s.metaItem}>
            <Text style={s.metaIcon}>📍</Text>
            <Text style={s.metaText} numberOfLines={1}>
              {item.location}
            </Text>
          </View>
        </View>

        <View style={s.cardFooter}>
          <Text style={[s.spotsText, { color: full ? "#555" : diffColor }]}>
            {full ? "No spots left" : `${item.available_spots} spots left`}
          </Text>
          {showAction && (
            <View style={[s.bookBtn, isBooked && s.cancelBtn]}>
              <Pressable
                style={({ pressed }) => [
                  s.bookBtnPressable,
                  (pressed || isActionDisabled) && { opacity: 0.65 },
                ]}
                disabled={isActionDisabled}
                onPress={(event) => {
                  event.stopPropagation();
                  if (isBooked) {
                    onCancelPress();
                    return;
                  }

                  onBookPress();
                }}
              >
                <Text style={[s.bookBtnText, isBooked && s.cancelBtnText]}>
                  {isBooked ? "Cancel" : "Book"}
                </Text>
              </Pressable>
            </View>
          )}
        </View>
      </View>
    </Pressable>
  );
}

export function ClassesScreen() {
  const [filter, setFilter] = useState("All");
  const [dayFilter, setDayFilter] = useState<number | null>(null);
  const [search, setSearch] = useState("");
  const router = useRouter();
  const { user } = useAuthState();
  const { data, isLoading, isError } = useClasses();
  const { data: bookings, isLoading: isLoadingBookings } = useMyBookings();
  const cancelMutation = useCancelBooking();

  const bookedClassIds = useMemo(() => {
    return new Set((bookings ?? []).map((booking) => booking.gymClass.id));
  }, [bookings]);

  const filtered = useMemo(() => {
    if (!data) return [];
    return data.filter((c) => {
      const matchDiff =
        filter === "All" ||
        c.difficulty_level.toLowerCase() === filter.toLowerCase();
      const matchDay = dayFilter === null || c.day_of_week === dayFilter;
      const matchSearch =
        search === "" || c.title.toLowerCase().includes(search.toLowerCase());
      return matchDiff && matchDay && matchSearch;
    });
  }, [data, dayFilter, filter, search]);

  const onCancelBooking = (gymClass: GymClass) => {
    Alert.alert("Cancel booking", "Remove this class from your bookings?", [
      { text: "Keep it", style: "cancel" },
      {
        text: "Cancel booking",
        style: "destructive",
        onPress: async () => {
          try {
            const result = await cancelMutation.mutateAsync(gymClass.id);
            Alert.alert("Cancelled", result.message);
          } catch (err) {
            Alert.alert("Error", (err as Error).message);
          }
        },
      },
    ]);
  };

  return (
    <SafeAreaView style={s.root} edges={["top"]}>
      <StatusBar barStyle="light-content" backgroundColor="#0A0A0A" />

      {/* Header */}
      <View style={s.header}>
        <Text style={s.heading}>Classes</Text>
        <Text style={s.subHeading}>{filtered.length} available</Text>
      </View>

      {/* Search Bar */}
      <View style={s.searchWrap}>
        <Text style={s.searchIcon}>🔍</Text>
        <TextInput
          style={s.searchInput}
          placeholder="Search classes..."
          placeholderTextColor="#444"
          value={search}
          onChangeText={setSearch}
          returnKeyType="search"
        />
        {search.length > 0 && (
          <Pressable onPress={() => setSearch("")}>
            <Text style={{ color: "#555", fontSize: 16 }}>✕</Text>
          </Pressable>
        )}
      </View>

      {/* Day Filter */}
      <FlatList
        style={s.filterBar}
        data={DAY_FILTERS}
        horizontal
        showsHorizontalScrollIndicator={false}
        keyExtractor={(f) => f.label}
        contentContainerStyle={s.filterList}
        renderItem={({ item }) => {
          const active = item.value === dayFilter;
          return (
            <Pressable
              style={[s.filterChip, active ? s.dayFilterChipActive : null]}
              onPress={() => setDayFilter(item.value)}
            >
              <Text
                style={[
                  s.filterChipText,
                  active ? s.filterChipTextActive : null,
                ]}
              >
                {item.label}
              </Text>
            </Pressable>
          );
        }}
      />

      {/* Difficulty Filter */}
      <FlatList
        style={[s.filterBar]}
        data={FILTERS}
        horizontal
        showsHorizontalScrollIndicator={false}
        keyExtractor={(f) => f}
        contentContainerStyle={s.filterList}
        renderItem={({ item }) => {
          const active = item === filter;
          const color =
            item === "All"
              ? "#22D3EE"
              : (DIFF_COLORS[item.toLowerCase()] ?? "#22D3EE");
          return (
            <Pressable
              style={[
                s.filterChip,
                active && { backgroundColor: color, borderColor: color },
              ]}
              onPress={() => setFilter(item)}
            >
              <Text style={[s.filterChipText, active && { color: "#000" }]}>
                {item}
              </Text>
            </Pressable>
          );
        }}
      />

      {/* List */}
      {isLoading ? (
        <View style={s.center}>
          <ActivityIndicator size="large" color="#22D3EE" />
        </View>
      ) : isError ? (
        <View style={s.center}>
          <Text style={s.errorText}>Could not load classes</Text>
        </View>
      ) : filtered.length === 0 ? (
        <View style={s.center}>
          <Text style={{ fontSize: 40 }}>🤸</Text>
          <Text style={s.emptyText}>No classes found</Text>
          <Text style={s.emptySubText}>Try another search or filter</Text>
        </View>
      ) : (
        <FlatList
          style={{ marginTop: 15 }}
          data={filtered}
          keyExtractor={(i) => i.id}
          contentContainerStyle={s.list}
          showsVerticalScrollIndicator={false}
          renderItem={({ item }) => (
            <ClassCard
              item={item}
              isBooked={bookedClassIds.has(item.id)}
              isActionDisabled={
                cancelMutation.isPending || Boolean(user && isLoadingBookings)
              }
              onPress={() =>
                router.push({
                  pathname: "/classes/[classId]",
                  params: { classId: item.id },
                })
              }
              onBookPress={() =>
                router.push({
                  pathname: "/bookings/new",
                  params: {
                    classId: item.id,
                    className: item.title,
                    classDate: item.date,
                  },
                })
              }
              onCancelPress={() => onCancelBooking(item)}
            />
          )}
        />
      )}
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#0A0A0A" },
  header: {
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 4,
    flexDirection: "row",
    alignItems: "baseline",
    gap: 10,
  },
  heading: { color: "#FFF", fontSize: 26, fontWeight: "900" },
  subHeading: { color: "#444", fontSize: 13 },
  searchWrap: {
    flexDirection: "row",
    alignItems: "center",
    marginHorizontal: 20,
    marginVertical: 10,
    backgroundColor: "#141414",
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: "#222",
  },
  searchIcon: { fontSize: 15, marginRight: 8 },
  searchInput: { flex: 1, color: "#FFF", fontSize: 14, padding: 0 },
  filterBar: { flexGrow: 0, flexShrink: 0 },
  difficultyFilterBar: { marginTop: 10 },
  filterList: { paddingHorizontal: 20, gap: 8, paddingBottom: 12 },
  filterChip: {
    height: 36,
    borderWidth: 1,
    borderColor: "#2A2A2A",
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 0,
    backgroundColor: "#141414",
    alignItems: "center",
    justifyContent: "center",
  },
  filterChipText: {
    color: "#888",
    fontSize: 13,
    fontWeight: "600",
    lineHeight: 16,
  },
  dayFilterChipActive: { backgroundColor: "#22D3EE", borderColor: "#22D3EE" },
  filterChipTextActive: { color: "#000" },
  list: { paddingHorizontal: 20, paddingBottom: 24, gap: 14 },
  center: { flex: 1, alignItems: "center", justifyContent: "center", gap: 8 },
  errorText: { color: "#EF4444", fontSize: 14 },
  emptyText: { color: "#FFF", fontSize: 16, fontWeight: "700", marginTop: 8 },
  emptySubText: { color: "#555", fontSize: 13 },
  card: {
    backgroundColor: "#141414",
    borderRadius: 16,
    overflow: "hidden",
    borderWidth: 1.5,
    borderColor: "#3F5661",
    shadowColor: "#22D3EE",
    shadowOpacity: 0.14,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 5 },
    elevation: 2,
  },
  cardImgWrap: { height: 50, position: "relative" },
  cardImg: { ...StyleSheet.absoluteFill },
  cardImgOverlay: {
    ...StyleSheet.absoluteFill,
    backgroundColor: "#000",
    opacity: 0.25,
  },
  diffPill: {
    position: "absolute",
    top: 10,
    right: 10,
    borderWidth: 1,
    borderRadius: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  diffPillText: { fontSize: 10, fontWeight: "800", letterSpacing: 1 },
  fullBanner: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: "#00000088",
    paddingVertical: 6,
    alignItems: "center",
  },
  fullBannerText: {
    color: "#EF4444",
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 2,
  },
  cardBody: { padding: 16, gap: 6 },
  cardTitle: { color: "#FFF", fontSize: 16, fontWeight: "800", lineHeight: 22 },
  cardTrainer: { color: "#777", fontSize: 13 },
  cardMeta: { flexDirection: "row", gap: 16, marginTop: 2 },
  metaItem: { flexDirection: "row", alignItems: "center", gap: 4 },
  metaIcon: { fontSize: 12 },
  metaText: { color: "#666", fontSize: 12 },
  cardFooter: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 8,
  },
  spotsText: { fontSize: 13, fontWeight: "600" },
  bookBtn: {
    minWidth: 72,
    minHeight: 28,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 4,
    borderWidth: 1,
    borderColor: "gray",
    backgroundColor: "#0A0A0A",
    overflow: "hidden",
  },
  cancelBtn: {
    borderColor: "#EF444455",
    backgroundColor: "#EF444411",
  },
  bookBtnPressable: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    alignItems: "center",
    justifyContent: "center",
  },
  bookBtnText: {
    color: "#D1D5DB",
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 1,
    textAlign: "center",
  },
  cancelBtnText: { color: "#f87171" },
});
