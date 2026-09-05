import { useMemo, useState } from "react";
import {
  View, Pressable, FlatList, ActivityIndicator, StyleSheet, StatusBar, ImageBackground, TextInput } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import type { PublicClassTemplate } from "@/features/classes/services/classesService";
import { usePublicClassTemplates } from "@/features/classes/hooks/useClasses";
import { colors, difficultyColor, fontStyle, withAlpha } from "@/theme";

import { Text } from "@/components/ui/Text";
const DEFAULT_CLASS_IMAGE =
  "https://images.unsplash.com/photo-1571019614242-c5c5dee9f50b?w=400&q=70";

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
  const diffColor = difficultyColor(item.difficulty_level);
  const imgUri = item.class_type_image_url || DEFAULT_CLASS_IMAGE;

  return (
    <Pressable
      style={({ pressed }) => [pressed && { opacity: 0.8 }]}
      onPress={onPress}
    >
      <ImageBackground
        source={{ uri: imgUri }}
        style={s.card}
        imageStyle={s.cardImg}
        resizeMode="cover"
      >
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
      </ImageBackground>
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
      <StatusBar barStyle="light-content" backgroundColor={colors.background} />

      <View style={s.header}>
        <Pressable style={s.backBtn} onPress={() => router.back()}>
          <MaterialCommunityIcons
            name="chevron-left"
            size={28}
            color={colors.accent.cyan}
          />
        </Pressable>
        <View>
          <Text variant="title" style={s.heading}>Clases</Text>
          <Text style={s.subHeading}>{filtered.length} Clases Disponibles</Text>
        </View>
      </View>

      <View style={s.searchWrap}>
        <Text style={s.searchIcon}>🔍</Text>
        <TextInput
          style={s.searchInput}
          placeholder="Search classes..."
          placeholderTextColor={colors.muted}
          value={search}
          onChangeText={setSearch}
          returnKeyType="search"
        />
        {search.length > 0 && (
          <Pressable onPress={() => setSearch("")}>
            <Text style={{ color: colors.muted, fontSize: 16 }}>✕</Text>
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
              ? colors.accent.cyan
              : difficultyColor(item);
          return (
            <Pressable
              style={[
                s.filterChip,
                active && { backgroundColor: color, borderColor: color },
              ]}
              onPress={() => setFilter(item)}
            >
              <Text style={[s.filterChipText, active && { color: colors.inverse }]}>
                {item}
              </Text>
            </Pressable>
          );
        }}
      />

      {isLoading ? (
        <View style={s.center}>
          <ActivityIndicator size="large" color={colors.accent.cyan} />
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
  root: { flex: 1, backgroundColor: colors.background },
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
    backgroundColor: colors.surface.DEFAULT,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: "center",
    justifyContent: "center",
  },
  heading: { color: colors.foreground, fontSize: 26, fontWeight: "900", ...fontStyle.title },
  subHeading: { color: colors.muted, fontSize: 13 },
  searchWrap: {
    flexDirection: "row",
    alignItems: "center",
    marginHorizontal: 20,
    marginVertical: 10,
    backgroundColor: colors.surface.DEFAULT,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: colors.border,
  },
  searchIcon: { fontSize: 15, marginRight: 8 },
  searchInput: { flex: 1, color: colors.foreground, fontSize: 14, padding: 0 },
  filterBar: { flexGrow: 0, flexShrink: 0 },
  filterList: { paddingHorizontal: 20, gap: 8, paddingBottom: 12 },
  filterChip: {
    height: 36,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 0,
    backgroundColor: colors.surface.DEFAULT,
    alignItems: "center",
    justifyContent: "center",
  },
  filterChipText: {
    color: colors.muted,
    fontSize: 13,
    fontWeight: "600",
    lineHeight: 16,
  },
  dayFilterChipActive: { backgroundColor: colors.accent.cyan, borderColor: colors.accent.cyan },
  filterChipTextActive: { color: colors.inverse },
  list: { paddingHorizontal: 20, paddingBottom: 24, gap: 14 },
  center: { flex: 1, alignItems: "center", justifyContent: "center", gap: 8 },
  errorText: { color: colors.danger, fontSize: 14 },
  emptyText: { color: colors.foreground, fontSize: 16, fontWeight: "700", marginTop: 8 },
  emptySubText: { color: colors.muted, fontSize: 13 },
  card: {
    backgroundColor: colors.surface.DEFAULT,
    borderRadius: 16,
    overflow: "hidden",
    borderWidth: 1.5,
    borderColor: withAlpha(colors.accent.cyan, "55"),
    shadowColor: colors.accent.cyan,
    shadowOpacity: 0.14,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 5 },
    elevation: 2,
  },
  cardImg: { opacity: 0.4, borderRadius: 16 },
  diffPill: {
    position: "absolute",
    top: 10,
    right: 10,
    zIndex: 1,
    borderWidth: 1,
    borderRadius: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  diffPillText: { fontSize: 10, fontWeight: "800", letterSpacing: 1 },
  cardBody: { padding: 16, paddingRight: 96, gap: 6 },
  cardTitle: { color: colors.foreground, fontSize: 16, fontWeight: "800", lineHeight: 22 },
  cardTrainer: { color: colors.muted, fontSize: 13 },
  cardMeta: { flexDirection: "row", gap: 12, marginTop: 2, flexWrap: "wrap" },
  metaItem: { flexDirection: "row", alignItems: "center", gap: 4 },
  metaIcon: { fontSize: 12 },
  metaText: { color: colors.muted, fontSize: 12 },
  cardFooter: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 8,
  },
  validityText: { fontSize: 12, color: colors.muted },
  bookBtn: {
    minWidth: 92,
    minHeight: 28,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 6,
    borderWidth: 1,
    borderColor: withAlpha(colors.accent.cyan, "55"),
    backgroundColor: withAlpha(colors.accent.cyan, "22"),
    overflow: "hidden",
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  bookBtnText: {
    color: colors.accent.cyan,
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 0.2,
    textAlign: "center",
  },
});
