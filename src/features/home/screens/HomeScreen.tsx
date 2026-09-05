import { useMemo, useRef, useState } from "react";
import { Animated, Dimensions, FlatList, Image, Pressable, ScrollView, StatusBar, StyleSheet, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { useAuthState } from "@/features/auth/hooks/useAuthState";
import { useMyBookings } from "@/features/bookings/hooks/useBookings";
import { useActiveClassTypes } from "@/features/class-types/hooks/useClassTypes";
import { usePublicClassTemplates } from "@/features/classes/hooks/useClasses";
import { useGymBranding } from "@/features/home/hooks/useGymBranding";
import { useHomeCarousel } from "@/features/home/hooks/useHomeCarousel";
import { useNotificationFeed } from "@/features/notifications";
import { toDateKey } from "@/utils/date";
import { Avatar } from "@/features/profile/screens/ProfileScreen";
import { colors, difficultyColor, fontStyle, withAlpha } from "@/theme";
import { Text } from "@/components/ui/Text";
const { width: SW } = Dimensions.get("window");
const DRAWER_W = SW * 0.78;

const DEFAULT_HERO_SLIDES = [
  {
    id: "1",
    title: "Calisthenics\nFundamentals",
    sub: "Build real strength with bodyweight",
    tag: "BEGINNER",
    tagColor: colors.accent.cyan,
    imageUri:
      "https://images.unsplash.com/photo-1571019614242-c5c5dee9f50b?w=900&q=80",
  },
  {
    id: "2",
    title: "Advanced\nMuscle Up",
    sub: "Master the bar and ring movements",
    tag: "ADVANCED",
    tagColor: colors.accent.purple,
    imageUri:
      "https://images.unsplash.com/photo-1526506118085-60ce8714f8c5?w=900&q=80",
  },
  {
    id: "3",
    title: "Handstand\nMastery",
    sub: "Balance, control and body awareness",
    tag: "INTERMEDIATE",
    tagColor: colors.accent.amber,
    imageUri:
      "https://images.unsplash.com/photo-1576094168768-4078c686a1c5?w=500&auto=format&fit=crop&q=60&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxzZWFyY2h8Mnx8aGFuZHN0YW5kfGVufDB8fDB8fHww",
  },
];

const DRAWER_HREFS = {
  book: "/(tabs)/bookings",
  sub: "/subscribe",
  find: "/(tabs)/classes",
} as const;

type TabRoute = "/(tabs)/classes" | "/(tabs)/bookings" | "/(tabs)/profile";

export function HomeScreen() {
  const [slide, setSlide] = useState(0);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [selectedTypeId, setSelectedTypeId] = useState<string>("all");
  const drawerX = useRef(new Animated.Value(-DRAWER_W)).current;
  const overlayAlpha = useRef(new Animated.Value(0)).current;
  const router = useRouter();
  const { user, displayName, avatarUrl } = useAuthState();
  const { data: bookings } = useMyBookings();
  const todayDate = useMemo(() => toDateKey(new Date()), []);
  const { data: templates, isLoading: isLoadingClasses } =
    usePublicClassTemplates();
  const { data: classTypes } = useActiveClassTypes();
  const { data: carousel } = useHomeCarousel();
  const { gymName } = useGymBranding();
  const { data: notifications } = useNotificationFeed();
  const unreadCount = useMemo(
    () => (user ? (notifications ?? []).filter((item) => !item.read_at).length : 0),
    [notifications, user],
  );
  const unreadLabel = unreadCount > 9 ? "9+" : String(unreadCount);

  const drawerItems = [
    {
      id: "book",
      icon: "📅",
      label: "Reserva una Clase",
      href: DRAWER_HREFS.book,
    },
    {
      id: "sub",
      icon: "💳",
      label: `Querés Formar Parte de ${gymName}?`,
      href: DRAWER_HREFS.sub,
    },
    {
      id: "find",
      icon: "🔍",
      label: "Encuentra una Clase para Ti",
      href: DRAWER_HREFS.find,
    },
  ] as const;

  const heroSlides =
    carousel?.slides && carousel.slides.length > 0
      ? carousel.slides
      : DEFAULT_HERO_SLIDES;

  const todayClasses = useMemo(() => {
    const todayDay = new Date().getUTCDay();
    return (templates ?? []).filter(
      (item) => (item.days_of_week_mask & (1 << todayDay)) !== 0,
    );
  }, [templates]);

  const typeChips = useMemo(
    () => [
      { id: "all", label: "Todas" },
      ...(classTypes ?? []).map((item) => ({
        id: item.id,
        label: item.nombre,
      })),
    ],
    [classTypes],
  );

  const filteredTodayClasses = useMemo(() => {
    if (selectedTypeId === "all") {
      return todayClasses;
    }

    return todayClasses.filter((item) => item.class_type_id === selectedTypeId);
  }, [selectedTypeId, todayClasses]);

  const bookingStats = useMemo(() => {
    const bookedClasses = bookings ?? [];
    const today = new Date();
    const currentDay = today.getUTCDay();
    const weekStart = new Date(
      Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate()),
    );
    weekStart.setUTCDate(
      weekStart.getUTCDate() - (currentDay === 0 ? 6 : currentDay - 1),
    );
    const weekEnd = new Date(weekStart);
    weekEnd.setUTCDate(weekStart.getUTCDate() + 6);

    const dayCounts = new Map<string, number>();
    for (const item of bookedClasses) {
      const date = item.gymClass.date;
      if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) continue;
      dayCounts.set(date, (dayCounts.get(date) ?? 0) + 1);
    }

    let peakDate: string | undefined;
    let peakCount = 0;
    for (const [date, count] of dayCounts) {
      if (
        count > peakCount ||
        (count === peakCount && date > (peakDate ?? ""))
      ) {
        peakCount = count;
        peakDate = date;
      }
    }

    return [
      {
        label: "Classes\nReservadas",
        val: String(bookedClasses.length),
        params: { filter: "all" as const },
      },
      {
        label: "Esta\nSemana",
        val: String(
          bookedClasses.filter((item) => {
            if (!/^\d{4}-\d{2}-\d{2}$/.test(item.gymClass.date)) return false;

            const classDate = new Date(`${item.gymClass.date}T00:00:00Z`);
            return classDate >= weekStart && classDate <= weekEnd;
          }).length,
        ),
        params: { filter: "week" as const },
      },
      {
        label: "Racha\nDiaria",
        val: peakCount > 0 ? String(peakCount) : "0",
        params: peakDate
          ? { filter: "day" as const, date: peakDate }
          : { filter: "all" as const },
      },
    ];
  }, [bookings]);

  const goToTab = (route: TabRoute) => {
    router.push(route);
  };

  const openDrawer = () => {
    setDrawerOpen(true);
    Animated.parallel([
      Animated.spring(drawerX, {
        toValue: 0,
        useNativeDriver: true,
        bounciness: 0,
        speed: 20,
      }),
      Animated.timing(overlayAlpha, {
        toValue: 1,
        duration: 220,
        useNativeDriver: true,
      }),
    ]).start();
  };

  const closeDrawer = () => {
    Animated.parallel([
      Animated.spring(drawerX, {
        toValue: -DRAWER_W,
        useNativeDriver: true,
        bounciness: 0,
        speed: 20,
      }),
      Animated.timing(overlayAlpha, {
        toValue: 0,
        duration: 180,
        useNativeDriver: true,
      }),
    ]).start(() => setDrawerOpen(false));
  };

  const handleDrawerNav = (href: (typeof drawerItems)[number]["href"]) => {
    closeDrawer();
    setTimeout(() => router.push(href as never), 200);
  };

  const onHeroScroll = (e: any) => {
    const idx = Math.round(e.nativeEvent.contentOffset.x / SW);
    setSlide(idx);
  };

  const greeting = (() => {
    const h = new Date().getHours();
    if (h < 12) return "Buen Día";
    if (h < 18) return "Buenas Tardes";
    return "Buenas Noches";
  })();

  return (
    <View style={s.root}>
      <StatusBar barStyle="light-content" backgroundColor={colors.background} />

      <SafeAreaView style={{ flex: 1 }} edges={["top"]}>
        {/* Header */}
        <View style={s.header}>
          <Pressable
            style={s.burger}
            onPress={openDrawer}
            accessibilityLabel="Open menu"
          >
            <View style={s.burgerLine} />
            <View style={[s.burgerLine, { width: 20 }]} />
            <View style={[s.burgerLine, { width: 14 }]} />
          </Pressable>
          <Text variant="display" style={s.logo}>{gymName}</Text>
          <Pressable
            style={s.notifBtn}
            onPress={() => router.push("/notifications")}
            accessibilityLabel={
              unreadCount > 0
                ? `Abrir notificaciones, ${unreadCount} sin leer`
                : "Abrir notificaciones"
            }
          >
            <Text style={{ fontSize: 20 }}>🔔</Text>
            {unreadCount > 0 ? (
              <View style={s.notifBadge}>
                <Text style={s.notifBadgeText}>{unreadLabel}</Text>
              </View>
            ) : null}
          </Pressable>
        </View>

        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 24 }}
        >
          {/* Greeting */}
          <View style={s.greet}>
            <Text style={s.greetSub}>{greeting},</Text>
            <Text variant="title" style={s.greetName}>
              {user && displayName ? `${displayName} 👊` : " "}
            </Text>
          </View>

          {/* Hero Carousel */}
          <FlatList
            data={heroSlides}
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            keyExtractor={(i) => i.id}
            onScroll={onHeroScroll}
            scrollEventThrottle={16}
            renderItem={({ item }) => (
              <View style={s.heroSlide}>
                <View style={s.heroCard}>
                  <Image
                    source={{ uri: item.imageUri }}
                    style={s.heroImage}
                    resizeMode="cover"
                  />
                  <View style={s.heroOverlay} />
                  <View style={s.heroContent}>
                    <View style={[s.heroBadge, { borderColor: item.tagColor }]}>
                      <Text style={[s.heroBadgeText, { color: item.tagColor }]}>
                        {item.tag}
                      </Text>
                    </View>
                    <Text variant="title" style={s.heroTitle}>{item.title}</Text>
                    <Text style={s.heroSub}>{item.sub}</Text>
                    <Pressable
                      style={[s.heroBtn, { borderColor: item.tagColor }]}
                      onPress={() => router.push("/(tabs)/classes")}
                    >
                      <Text style={[s.heroBtnText, { color: item.tagColor }]}>
                        Mira Nuestras Clases →
                      </Text>
                    </Pressable>
                  </View>
                </View>
              </View>
            )}
          />

          {/* Slide dots */}
          <View style={s.dots}>
            {heroSlides.map((_, i) => (
              <View key={i} style={[s.dot, i === slide && s.dotActive]} />
            ))}
          </View>

          {/* Stats Row */}
          <View style={s.statsRow}>
            {bookingStats.map((st, i) => (
              <Pressable
                key={i}
                style={s.statPressable}
                onPress={() =>
                  user 
                  ? router.push({pathname: "/bookings",params: st.params,})
                  : router.push("/(tabs)/bookings")
                }
              >
                <View style={s.statCard}>
                  <Text style={s.statVal}>{st.val}</Text>
                  <Text style={s.statLabel}>{st.label}</Text>
                </View>
              </Pressable>
            ))}
          </View>

          {/* Section header */}
          <View style={s.sectionRow}>
            <Text style={s.sectionTitle}>Las Clases de Hoy</Text>
            <Pressable
              onPress={() => goToTab("/(tabs)/classes")}
              accessibilityLabel="See all classes"
            >
              <Text style={s.sectionLink}>Ver todas →</Text>
            </Pressable>
          </View>

          {/* Filter chips */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ paddingHorizontal: 20, gap: 8 }}
            style={{ marginBottom: 16 }}
          >
            {typeChips.map((chip) => {
              const active = chip.id === selectedTypeId;

              return (
                <Pressable
                  key={chip.id}
                  style={[s.chip, active && s.chipActive]}
                  onPress={() => setSelectedTypeId(chip.id)}
                >
                  <Text style={[s.chipText, active && s.chipTextActive]}>
                    {chip.label}
                  </Text>
                </Pressable>
              );
            })}
          </ScrollView>

          {/* Mini class cards */}
          <View style={{ paddingHorizontal: 20, gap: 12 }}>
            {isLoadingClasses ? (
              <View style={s.emptyClassCard}>
                <Text style={s.emptyClassText}>
                  Cargando las clases de hoy...
                </Text>
              </View>
            ) : !filteredTodayClasses?.length ? (
              <View style={s.emptyClassCard}>
                <Text style={s.emptyClassText}>No hay clases hoy.</Text>
              </View>
            ) : (
              filteredTodayClasses.map((c) => {
                const color = difficultyColor(c.difficulty_level);
                const diff = c.difficulty_level.slice(0, 3).toUpperCase();

                return (
                  <Pressable
                    key={c.id}
                    className="min-h-[84px] flex-row items-center rounded-2xl border border-border bg-background px-4 py-4"
                    style={({ pressed }) => pressed && { opacity: 0.75 }}
                    onPress={() =>
                      user
                        ? router.push({
                            pathname: "/bookings/new",
                            params: {
                              classId: c.id,
                              templateId: c.id,
                              className: c.title,
                              classDate: todayDate,
                            },
                          })
                        : router.push("/(tabs)/bookings")
                    }
                  >
                    <View
                      className="h-12 w-1 shrink-0 rounded-full"
                      style={{ backgroundColor: color }}
                    />

                    <View className="ml-4 flex-1">
                      <Text className="text-[15px] font-bold text-white">
                        {c.title}
                      </Text>
                      <Text className="mt-1 text-xs text-muted">
                        {c.trainer_name} · {c.start_time}
                      </Text>
                    </View>

                    <View className="ml-3 w-14 items-end">
                      <View
                        style={[
                          s.diffBadge,
                          {
                            backgroundColor: color + "22",
                            borderColor: color + "55",
                          },
                        ]}
                      >
                        <Text style={[s.diffText, { color }]}>{diff}</Text>
                      </View>
                      <Text className="mt-1 text-[11px] text-muted">
                        {c.duration_minutes} min
                      </Text>
                    </View>
                  </Pressable>
                );
              })
            )}
          </View>
        </ScrollView>
      </SafeAreaView>

      {/* Drawer Overlay */}
      {drawerOpen && (
        <Animated.View
          style={[
            StyleSheet.absoluteFill,
            s.overlay,
            { opacity: overlayAlpha },
          ]}
          pointerEvents="box-none"
        >
          <Pressable style={StyleSheet.absoluteFill} onPress={closeDrawer} />
        </Animated.View>
      )}

      {/* Drawer Panel */}
      <Animated.View
        style={[s.drawer, { transform: [{ translateX: drawerX }] }]}
      >
        <SafeAreaView style={{ flex: 1 }} edges={["top", "bottom"]}>
          <View style={s.drawerHead}>
            <Text variant="title" style={s.drawerLogo}>{gymName}</Text>
            <Pressable onPress={closeDrawer} style={s.drawerClose}>
              <Text style={s.drawerCloseText}>✕</Text>
            </Pressable>
          </View>
          <View style={s.drawerDivider} />
          <View
            style={{
              paddingHorizontal: 18,
              marginTop: 16,
              marginBottom: 8,
              justifyContent: "space-between",
              flexDirection: "row",
              alignItems: "center",
            }}
          >
            <View>
              <Text style={s.drawerGreet}>
                {user ? `Hola, ${displayName || "Amigo"}` : "Bienvenido!"}
              </Text>
              <Text style={s.drawerGreetSub}>
                {user
                  ? "Qué quieres hacer hoy?"
                  : "Inicia sesión para desbloquear reservas y tu perfil."}
              </Text>
            </View>
            <View>
              <Pressable
                style={({ pressed }) => [
                  s.drawerProfileBtn,
                  pressed && { opacity: 0.7 },
                ]}
                onPress={() => {
                  closeDrawer();
                  setTimeout(() => router.push("/(tabs)/profile"), 200);
                }}
              >
                {user ? (
                  <View style={s.drawerAvatar}>
                    <Avatar
                      name={displayName ?? ""}
                      avatarUrl={avatarUrl}
                      size={50}
                    />
                  </View>
                ) : null}
              </Pressable>
            </View>
          </View>

          <View style={{ paddingHorizontal: 18, marginTop: 10, gap: 4 }}>
            {drawerItems.map((item) => (
              <Pressable
                key={item.id}
                style={({ pressed }) => [
                  s.drawerItem,
                  pressed && s.drawerItemPressed,
                ]}
                onPress={() => handleDrawerNav(item.href)}
              >
                <View style={s.drawerItemMain}>
                  <Text style={s.drawerItemIcon}>{item.icon}</Text>
                  <Text style={s.drawerItemLabel}>{item.label}</Text>
                  <Text style={s.drawerItemArrow}>›</Text>
                </View>
              </Pressable>
            ))}
          </View>
          <View style={[s.drawerDivider, { marginTop: 24 }]} />
        </SafeAreaView>
      </Animated.View>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  burger: { gap: 5, padding: 4 },
  burgerLine: {
    width: 24,
    height: 2,
    backgroundColor: colors.foreground,
    borderRadius: 2,
  },
  logo: { fontSize: 20, color: colors.foreground, letterSpacing: 4 },
  logoAccent: { color: colors.accent.cyan },
  notifBtn: { padding: 4 },
  notifBadge: {
    alignItems: "center",
    backgroundColor: colors.accent.cyan,
    borderColor: colors.background,
    borderRadius: 8,
    borderWidth: 2,
    height: 20,
    justifyContent: "center",
    minWidth: 20,
    paddingHorizontal: 3,
    position: "absolute",
    right: 0,
    top: 0,
  },
  notifBadgeText: {
    color: colors.inverse,
    fontSize: 9,
    fontVariant: ["tabular-nums"],
    fontWeight: "800",
    lineHeight: 11,
  },
  greet: { paddingHorizontal: 20, marginTop: 4, marginBottom: 14 },
  greetSub: { color: colors.muted, fontSize: 14 },
  greetName: { color: colors.foreground, fontSize: 30, fontWeight: "800", marginTop: 2 },
  heroSlide: { width: SW, paddingHorizontal: 20 },
  heroCard: {
    height: 244,
    position: "relative",
    overflow: "hidden",
    borderRadius: 24,
    backgroundColor: colors.surface.DEFAULT,
    borderWidth: 1,
    borderColor: colors.border,
  },
  heroImage: { position: "absolute", top: 0, right: 0, bottom: 0, left: 0 },
  heroOverlay: {
    position: "absolute",
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    backgroundColor: colors.inverse,
    opacity: 0.34,
  },
  heroContent: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    padding: 20,
    gap: 6,
  },
  heroBadge: {
    alignSelf: "flex-start",
    borderWidth: 1,
    borderRadius: 4,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  heroBadgeText: { fontSize: 10, fontWeight: "800", letterSpacing: 1.5 },
  heroTitle: { color: colors.foreground, fontSize: 34, fontWeight: "900", lineHeight: 34, ...fontStyle.title },
  heroSub: { color: "rgba(255,255,255,0.7)", fontSize: 14 },
  heroBtn: {
    alignSelf: "flex-start",
    marginTop: 4,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 7,
  },
  heroBtnText: { fontSize: 13, fontWeight: "700" },
  dots: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 6,
    marginTop: 12,
    marginBottom: 18,
  },
  dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: colors.faint },
  dotActive: { backgroundColor: colors.accent.cyan, width: 20 },
  statsRow: {
    flexDirection: "row",
    marginHorizontal: 20,
    gap: 10,
    marginBottom: 24,
    justifyContent: "space-between",
  },
  statPressable: { width: 100 },
  statCard: {
    width: 100,
    height: 94,
    backgroundColor: colors.surface.DEFAULT,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 16,
    borderWidth: 1,
    borderColor: colors.border,
  },
  statVal: { color: colors.accent.cyan, fontSize: 22, fontWeight: "800" },
  statLabel: {
    color: colors.muted,
    fontSize: 11,
    textAlign: "center",
    marginTop: 4,
    lineHeight: 16,
  },
  sectionRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    marginBottom: 14,
  },
  sectionTitle: { color: colors.foreground, fontSize: 17, fontWeight: "800" },
  sectionLink: { color: colors.accent.cyan, fontSize: 13, fontWeight: "600" },
  chip: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 7,
    backgroundColor: colors.surface.DEFAULT,
  },
  chipActive: { backgroundColor: colors.accent.cyan, borderColor: colors.accent.cyan },
  chipText: { color: colors.muted, fontSize: 13, fontWeight: "600" },
  chipTextActive: { color: colors.inverse },
  diffBadge: {
    borderWidth: 1,
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  diffText: { fontSize: 10, fontWeight: "800", letterSpacing: 0.5 },
  emptyClassCard: {
    minHeight: 84,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.background,
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  emptyClassText: { color: colors.muted, fontSize: 13, fontWeight: "600" },
  overlay: { backgroundColor: colors.inverse, zIndex: 10 },
  drawer: {
    position: "absolute",
    top: 0,
    left: 0,
    bottom: 0,
    width: DRAWER_W,
    backgroundColor: colors.tabBar,
    zIndex: 20,
    borderRightWidth: 1,
    borderRightColor: colors.surface.elevated,
    shadowColor: colors.inverse,
    shadowOffset: { width: 4, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 16,
    elevation: 20,
  },
  drawerHead: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 18,
    paddingTop: 8,
    paddingBottom: 16,
  },
  drawerLogo: {
    fontSize: 22,
    fontWeight: "900",
    color: colors.foreground,
    letterSpacing: 4,
    ...fontStyle.title,
  },
  drawerLogoAccent: { color: colors.accent.cyan },
  drawerClose: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.surface.elevated,
    alignItems: "center",
    justifyContent: "center",
  },
  drawerCloseText: { color: colors.muted, fontSize: 14 },
  drawerDivider: {
    height: 1,
    backgroundColor: colors.surface.elevated,
    marginHorizontal: 24,
  },
  drawerGreet: { color: colors.foreground, fontSize: 18, fontWeight: "800" },
  drawerGreetSub: { color: colors.muted, fontSize: 13, marginTop: 2 },
  drawerItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 12,
    paddingVertical: 16,
    borderRadius: 12,
  },
  drawerItemPressed: { backgroundColor: colors.surface.elevated },
  drawerItemMain: {
    flexDirection: "row",
    alignItems: "center",
    flexGrow: 1,
    flexShrink: 1,
  },
  drawerItemIcon: { fontSize: 20, width: 28, marginRight: 14 },
  drawerItemLabel: {
    flexGrow: 1,
    flexShrink: 1,
    color: colors.foreground,
    fontSize: 15,
    fontWeight: "600",
  },
  drawerItemArrow: { color: colors.muted, fontSize: 22, marginLeft: 12 },
  drawerProfileBtn: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 24,
    paddingVertical: 20,
  },
  drawerAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: withAlpha(colors.accent.cyan, "22"),
    borderWidth: 1,
    borderColor: withAlpha(colors.accent.cyan, "44"),
    alignItems: "center",
    justifyContent: "center",
  },
  drawerProfileName: { color: colors.foreground, fontSize: 15, fontWeight: "700" },
  drawerProfileSub: { color: colors.accent.cyan, fontSize: 12, marginTop: 2 },
});
