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
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import type { PublicClassTemplate } from "@/features/classes/services/classesService";
import { usePublicClassTemplates } from "@/features/classes/hooks/useClasses";

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
  { label: "Dom", value: 0 },
  { label: "Lun", value: 1 },
  { label: "Mar", value: 2 },
  { label: "Mié", value: 3 },
  { label: "Jue", value: 4 },
  { label: "Vie", value: 5 },
  { label: "Sáb", value: 6 },
] as const;

function hasDay(mask: number, day: number): boolean {
  return (mask & (1 << day)) !== 0;
}

function formatDays(mask: number): string {
  return DAY_FILTERS.filter(
    (item) => item.value !== null && hasDay(mask, item.value),
  )
    .map((item) => item.label)
    .join(" + ");
}

interface ClassCardProps {
  item: PublicClassTemplate;
  onPress: () => void;
}

function ClassCard({ item, onPress }: ClassCardProps) {
  const diffColor = DIFF_COLORS[item.difficulty_level] ?? "#22D3EE";
  const typeKey = item.class_type_slug?.toLowerCase() ?? "default";
  const imgUri = CLASS_IMAGES[typeKey] ?? CLASS_IMAGES.default;

  return (
    <Pressable
      style={({ pressed }) => [s.card, pressed && { opacity: 0.8 }]}
      onPress={onPress}
    >
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
      </View>

      <View style={s.cardBody}>
        <Text style={s.cardTitle} numberOfLines={2}>
          {item.title}
        </Text>
        <Text style={s.cardTrainer}>🏋️ {item.trainer_name}</Text>

        <View style={s.cardMeta}>
          <View style={s.metaItem}>
            <Text style={s.metaIcon}>🗓</Text>
            <Text style={s.metaText}>{formatDays(item.days_of_week_mask)}</Text>
          </View>
          <View style={s.metaItem}>
            <Text style={s.metaIcon}>⏱</Text>
            <Text style={s.metaText}>{item.start_time}</Text>
          </View>
          <View style={s.metaItem}>
            <Text style={s.metaIcon}>📍</Text>
            <Text style={s.metaText} numberOfLines={1}>
              {item.location_name}
            </Text>
          </View>
        </View>

        <View style={[s.cardFooter, { justifyContent: "flex-end" }]}>
          <View style={s.bookBtn}>
            <Text style={s.bookBtnText}>La Reservamos?</Text>
          </View>
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
  const { data, isLoading, isError } = usePublicClassTemplates();

  const filtered = useMemo(() => {
    if (!data) return [];
    return data.filter((c) => {
      const matchDiff =
        filter === "All" ||
        c.difficulty_level.toLowerCase() === filter.toLowerCase();
      const matchDay =
        dayFilter === null || hasDay(c.days_of_week_mask, dayFilter);
      const matchSearch =
        search === "" || c.title.toLowerCase().includes(search.toLowerCase());
      return matchDiff && matchDay && matchSearch;
    });
  }, [data, dayFilter, filter, search]);

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
        <View>
          <Text style={s.heading}>Clases</Text>
          <Text style={s.subHeading}>{filtered.length} Clases Disponibles</Text>
        </View>
      </View>

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

      {isLoading ? (
        <View style={s.center}>
          <ActivityIndicator size="large" color="#22D3EE" />
        </View>
      ) : isError ? (
        <View style={s.center}>
          <Text style={s.errorText}>No se pudieron cargar las clases</Text>
        </View>
      ) : filtered.length === 0 ? (
        <View style={s.center}>
          <Text style={{ fontSize: 40 }}>🤸</Text>
          <Text style={s.emptyText}>Sin clases disponibles</Text>
          <Text style={s.emptySubText}>Prueba otra búsqueda o filtro</Text>
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
              onPress={() =>
                router.push({
                  pathname: "/classes/[classId]",
                  params: { classId: item.id },
                })
              }
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
    alignItems: "center",
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
  cardBody: { padding: 16, gap: 6 },
  cardTitle: { color: "#FFF", fontSize: 16, fontWeight: "800", lineHeight: 22 },
  cardTrainer: { color: "#777", fontSize: 13 },
  cardMeta: { flexDirection: "row", gap: 12, marginTop: 2, flexWrap: "wrap" },
  metaItem: { flexDirection: "row", alignItems: "center", gap: 4 },
  metaIcon: { fontSize: 12 },
  metaText: { color: "#666", fontSize: 12 },
  cardFooter: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 8,
  },
  validityText: { fontSize: 12, color: "#9CA3AF" },
  bookBtn: {
    minWidth: 92,
    minHeight: 28,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 6,
    borderWidth: 1,
    borderColor: "#22D3EE55",
    backgroundColor: "#22D3EE22",
    overflow: "hidden",
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  bookBtnText: {
    color: "#22D3EE",
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 0.2,
    textAlign: "center",
  },
});
