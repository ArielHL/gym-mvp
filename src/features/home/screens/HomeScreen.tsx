import { useMemo, useRef, useState } from "react";
import {
  Animated,
  Dimensions,
  FlatList,
  Image,
  Pressable,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { useAuthState } from "@/features/auth/hooks/useAuthState";
import { useMyBookings } from "@/features/bookings/hooks/useBookings";
import { useClasses } from "@/features/classes/hooks/useClasses";
import { toDateKey } from "@/utils/date";

const { width: SW } = Dimensions.get("window");
const DRAWER_W = SW * 0.78;

const HERO_SLIDES = [
  {
    id: "1",
    title: "Calisthenics\nFundamentals",
    sub: "Build real strength with bodyweight",
    tag: "BEGINNER",
    tagColor: "#22D3EE",
    imageUri:
      "https://images.unsplash.com/photo-1571019614242-c5c5dee9f50b?w=900&q=80",
  },
  {
    id: "2",
    title: "Advanced\nMuscle Up",
    sub: "Master the bar and ring movements",
    tag: "ADVANCED",
    tagColor: "#A855F7",
    imageUri:
      "https://images.unsplash.com/photo-1526506118085-60ce8714f8c5?w=900&q=80",
  },
  {
    id: "3",
    title: "Handstand\nMastery",
    sub: "Balance, control and body awareness",
    tag: "INTERMEDIATE",
    tagColor: "#F59E0B",
    imageUri:
      "https://images.unsplash.com/photo-1576094168768-4078c686a1c5?w=500&auto=format&fit=crop&q=60&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxzZWFyY2h8Mnx8aGFuZHN0YW5kfGVufDB8fDB8fHww",
  },
];

const DRAWER_ITEMS = [
  {
    id: "book",
    icon: "📅",
    label: "Book Classes",
    tab: "/(tabs)/bookings" as const,
  },
  {
    id: "sub",
    icon: "💳",
    label: "Pay a Subscription",
    tab: "/(tabs)/bookings" as const,
  },
  {
    id: "find",
    icon: "🔍",
    label: "Find a Class for You",
    tab: "/(tabs)/classes" as const,
  },
];

const DIFF_COLORS: Record<string, string> = {
  beginner: "#22D3EE",
  intermediate: "#F59E0B",
  advanced: "#A855F7",
};

type TabRoute = "/(tabs)/classes" | "/(tabs)/bookings" | "/(tabs)/profile";

export function HomeScreen() {
  const [slide, setSlide] = useState(0);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const drawerX = useRef(new Animated.Value(-DRAWER_W)).current;
  const overlayAlpha = useRef(new Animated.Value(0)).current;
  const router = useRouter();
  const { user, displayName } = useAuthState();
  const { data: bookings } = useMyBookings();
  const todayDate = useMemo(() => toDateKey(new Date()), []);
  const { data: todayClasses, isLoading: isLoadingClasses } =
    useClasses(todayDate);

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

    const bookedDateKeys = Array.from(
      new Set(
        bookedClasses
          .map((item) => item.gymClass.date)
          .filter((date): date is string => /^\d{4}-\d{2}-\d{2}$/.test(date)),
      ),
    ).sort((a, b) => b.localeCompare(a));

    let dayStreak = 0;
    if (bookedDateKeys.length > 0) {
      const bookedDateSet = new Set(bookedDateKeys);
      const cursor = new Date(`${bookedDateKeys[0]}T00:00:00Z`);

      while (bookedDateSet.has(cursor.toISOString().slice(0, 10))) {
        dayStreak += 1;
        cursor.setUTCDate(cursor.getUTCDate() - 1);
      }
    }

    return [
      { label: "Classes\nBooked", val: String(bookedClasses.length) },
      {
        label: "This\nWeek",
        val: String(
          bookedClasses.filter((item) => {
            if (!/^\d{4}-\d{2}-\d{2}$/.test(item.gymClass.date)) return false;

            const classDate = new Date(`${item.gymClass.date}T00:00:00Z`);
            return classDate >= weekStart && classDate <= weekEnd;
          }).length,
        ),
      },
      { label: "Day\nStreak", val: dayStreak > 0 ? `${dayStreak}🔥` : "0" },
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

  const handleDrawerNav = (tab: "/(tabs)/bookings" | "/(tabs)/classes") => {
    closeDrawer();
    setTimeout(() => router.push(tab), 200);
  };

  const onHeroScroll = (e: any) => {
    const idx = Math.round(e.nativeEvent.contentOffset.x / SW);
    setSlide(idx);
  };

  const greeting = (() => {
    const h = new Date().getHours();
    if (h < 12) return "Good morning";
    if (h < 18) return "Good afternoon";
    return "Good evening";
  })();

  return (
    <View style={s.root}>
      <StatusBar barStyle="light-content" backgroundColor="#0A0A0A" />

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
          <Text style={s.logo}>
            CALI<Text style={s.logoAccent}>FIT</Text>
          </Text>
          <Pressable
            style={s.notifBtn}
            onPress={() => goToTab("/(tabs)/profile")}
            accessibilityLabel="Go to profile tab"
          >
            <Text style={{ fontSize: 20 }}>🔔</Text>
          </Pressable>
        </View>

        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 24 }}
        >
          {/* Greeting */}
          <View style={s.greet}>
            <Text style={s.greetSub}>{greeting},</Text>
            <Text style={s.greetName}>
              {user && displayName ? `${displayName} 👊` : " "}
            </Text>
          </View>

          {/* Hero Carousel */}
          <FlatList
            data={HERO_SLIDES}
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
                    <Text style={s.heroTitle}>{item.title}</Text>
                    <Text style={s.heroSub}>{item.sub}</Text>
                    <Pressable
                      style={[s.heroBtn, { borderColor: item.tagColor }]}
                      onPress={() => router.push("/(tabs)/classes")}
                    >
                      <Text style={[s.heroBtnText, { color: item.tagColor }]}>
                        Explore Class →
                      </Text>
                    </Pressable>
                  </View>
                </View>
              </View>
            )}
          />

          {/* Slide dots */}
          <View style={s.dots}>
            {HERO_SLIDES.map((_, i) => (
              <View key={i} style={[s.dot, i === slide && s.dotActive]} />
            ))}
          </View>

          {/* Stats Row */}
          <View style={s.statsRow}>
            {bookingStats.map((st, i) => (
              <View key={i} style={s.statCard}>
                <Text style={s.statVal}>{st.val}</Text>
                <Text style={s.statLabel}>{st.label}</Text>
              </View>
            ))}
          </View>

          {/* Section header */}
          <View style={s.sectionRow}>
            <Text style={s.sectionTitle}>Today's Classes</Text>
            <Pressable
              onPress={() => goToTab("/(tabs)/classes")}
              accessibilityLabel="See all classes"
            >
              <Text style={s.sectionLink}>See all →</Text>
            </Pressable>
          </View>

          {/* Filter chips */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ paddingHorizontal: 20, gap: 8 }}
            style={{ marginBottom: 16 }}
          >
            {["All", "Strength", "Mobility", "Cardio", "Yoga"].map((c, i) => (
              <Pressable key={c} style={[s.chip, i === 0 && s.chipActive]}>
                <Text style={[s.chipText, i === 0 && s.chipTextActive]}>
                  {c}
                </Text>
              </Pressable>
            ))}
          </ScrollView>

          {/* Mini class cards */}
          <View style={{ paddingHorizontal: 20, gap: 12 }}>
            {isLoadingClasses ? (
              <View style={s.emptyClassCard}>
                <Text style={s.emptyClassText}>Loading today's classes...</Text>
              </View>
            ) : !todayClasses?.length ? (
              <View style={s.emptyClassCard}>
                <Text style={s.emptyClassText}>No classes today.</Text>
              </View>
            ) : (
              todayClasses.map((c) => {
                const color = DIFF_COLORS[c.difficulty_level] ?? "#22D3EE";
                const diff = c.difficulty_level.slice(0, 3).toUpperCase();

                return (
                  <Pressable
                    key={c.id}
                    className="min-h-[84px] flex-row items-center rounded-2xl border border-[#24262B] bg-[#111317] px-4 py-4"
                    style={({ pressed }) => pressed && { opacity: 0.75 }}
                    onPress={() =>
                      user
                        ? router.push({
                            pathname: "/bookings/new",
                            params: {
                              classId: c.id,
                              className: c.title,
                              classDate: c.date,
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
                      <Text className="mt-1 text-xs text-[#666]">
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
                      <Text className="mt-1 text-[11px] text-[#555]">
                        {c.available_spots} spots
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
            <Text style={s.drawerLogo}>
              CALI<Text style={s.drawerLogoAccent}>FIT</Text>
            </Text>
            <Pressable onPress={closeDrawer} style={s.drawerClose}>
              <Text style={s.drawerCloseText}>✕</Text>
            </Pressable>
          </View>
          <View style={s.drawerDivider} />
          <View
            style={{ paddingHorizontal: 24, marginTop: 16, marginBottom: 8 }}
          >
            <Text style={s.drawerGreet}>
              {user ? `Hey, ${displayName || "Athlete"}` : "Welcome"}
            </Text>
            <Text style={s.drawerGreetSub}>
              {user
                ? "What do you want to do today?"
                : "Sign in to unlock bookings and your profile."}
            </Text>
          </View>
          <View style={{ paddingHorizontal: 16, marginTop: 8, gap: 4 }}>
            {DRAWER_ITEMS.map((item) => (
              <Pressable
                key={item.id}
                style={({ pressed }) => [
                  s.drawerItem,
                  pressed && s.drawerItemPressed,
                ]}
                onPress={() => handleDrawerNav(item.tab)}
              >
                <Text style={s.drawerItemIcon}>{item.icon}</Text>
                <Text style={s.drawerItemLabel}>{item.label}</Text>
                <Text style={s.drawerItemArrow}>›</Text>
              </Pressable>
            ))}
          </View>
          <View style={[s.drawerDivider, { marginTop: 24 }]} />
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
            <View style={s.drawerAvatar}>
              <Text
                style={{ color: "#22D3EE", fontWeight: "700", fontSize: 18 }}
              >
                {(displayName || "?")[0].toUpperCase()}
              </Text>
            </View>
            <View style={{ flex: 1, marginLeft: 12 }}>
              <Text style={s.drawerProfileName}>
                {user ? displayName || "My Account" : "Guest"}
              </Text>
              <Text style={s.drawerProfileSub}>View profile →</Text>
            </View>
          </Pressable>
        </SafeAreaView>
      </Animated.View>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#0A0A0A" },
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
    backgroundColor: "#FFFFFF",
    borderRadius: 2,
  },
  logo: { fontSize: 20, fontWeight: "900", color: "#FFFFFF", letterSpacing: 4 },
  logoAccent: { color: "#22D3EE" },
  notifBtn: { padding: 4 },
  greet: { paddingHorizontal: 20, marginTop: 4, marginBottom: 14 },
  greetSub: { color: "#666", fontSize: 14 },
  greetName: { color: "#FFF", fontSize: 26, fontWeight: "800", marginTop: 2 },
  heroSlide: { width: SW, paddingHorizontal: 20 },
  heroCard: {
    height: 244,
    position: "relative",
    overflow: "hidden",
    borderRadius: 24,
    backgroundColor: "#141414",
    borderWidth: 1,
    borderColor: "#1F1F1F",
  },
  heroImage: { position: "absolute", top: 0, right: 0, bottom: 0, left: 0 },
  heroOverlay: {
    position: "absolute",
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    backgroundColor: "#000",
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
  heroTitle: { color: "#FFF", fontSize: 28, fontWeight: "900", lineHeight: 34 },
  heroSub: { color: "rgba(255,255,255,0.7)", fontSize: 13 },
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
  dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: "#333" },
  dotActive: { backgroundColor: "#22D3EE", width: 20 },
  statsRow: {
    flexDirection: "row",
    marginHorizontal: 20,
    gap: 10,
    marginBottom: 24,
  },
  statCard: {
    flex: 1,
    backgroundColor: "#141414",
    borderRadius: 14,
    alignItems: "center",
    paddingVertical: 16,
    borderWidth: 1,
    borderColor: "#242424",
  },
  statVal: { color: "#22D3EE", fontSize: 22, fontWeight: "800" },
  statLabel: {
    color: "#666",
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
  sectionTitle: { color: "#FFF", fontSize: 17, fontWeight: "800" },
  sectionLink: { color: "#22D3EE", fontSize: 13, fontWeight: "600" },
  chip: {
    borderWidth: 1,
    borderColor: "#2A2A2A",
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 7,
    backgroundColor: "#141414",
  },
  chipActive: { backgroundColor: "#22D3EE", borderColor: "#22D3EE" },
  chipText: { color: "#888", fontSize: 13, fontWeight: "600" },
  chipTextActive: { color: "#000" },
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
    borderColor: "#24262B",
    backgroundColor: "#111317",
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  emptyClassText: { color: "#666", fontSize: 13, fontWeight: "600" },
  overlay: { backgroundColor: "#000", zIndex: 10 },
  drawer: {
    position: "absolute",
    top: 0,
    left: 0,
    bottom: 0,
    width: DRAWER_W,
    backgroundColor: "#0E0E0E",
    zIndex: 20,
    borderRightWidth: 1,
    borderRightColor: "#1E1E1E",
    shadowColor: "#000",
    shadowOffset: { width: 4, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 16,
    elevation: 20,
  },
  drawerHead: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 24,
    paddingTop: 8,
    paddingBottom: 16,
  },
  drawerLogo: {
    fontSize: 22,
    fontWeight: "900",
    color: "#FFF",
    letterSpacing: 4,
  },
  drawerLogoAccent: { color: "#22D3EE" },
  drawerClose: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#1E1E1E",
    alignItems: "center",
    justifyContent: "center",
  },
  drawerCloseText: { color: "#888", fontSize: 14 },
  drawerDivider: {
    height: 1,
    backgroundColor: "#1A1A1A",
    marginHorizontal: 24,
  },
  drawerGreet: { color: "#FFF", fontSize: 18, fontWeight: "800" },
  drawerGreetSub: { color: "#555", fontSize: 13, marginTop: 2 },
  drawerItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    paddingHorizontal: 12,
    paddingVertical: 16,
    borderRadius: 12,
  },
  drawerItemPressed: { backgroundColor: "#1A1A1A" },
  drawerItemIcon: { fontSize: 20, width: 28 },
  drawerItemLabel: { flex: 1, color: "#DDD", fontSize: 15, fontWeight: "600" },
  drawerItemArrow: { color: "#444", fontSize: 22 },
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
    backgroundColor: "#0F2A2E",
    borderWidth: 1,
    borderColor: "#22D3EE44",
    alignItems: "center",
    justifyContent: "center",
  },
  drawerProfileName: { color: "#FFF", fontSize: 15, fontWeight: "700" },
  drawerProfileSub: { color: "#22D3EE", fontSize: 12, marginTop: 2 },
});
