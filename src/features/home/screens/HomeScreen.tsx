import { useRef, useState } from 'react';
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
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useAuthState } from '@/features/auth/hooks/useAuthState';

const { width: SW } = Dimensions.get('window');
const DRAWER_W = SW * 0.78;

const HERO_SLIDES = [
  {
    id: '1',
    title: 'Calisthenics\nFundamentals',
    sub: 'Build real strength with bodyweight',
    tag: 'BEGINNER',
    tagColor: '#22D3EE',
    imageUri: 'https://images.unsplash.com/photo-1571019614242-c5c5dee9f50b?w=900&q=80',
  },
  {
    id: '2',
    title: 'Advanced\nMuscle Up',
    sub: 'Master the bar and ring movements',
    tag: 'ADVANCED',
    tagColor: '#A855F7',
    imageUri: 'https://images.unsplash.com/photo-1526506118085-60ce8714f8c5?w=900&q=80',
  },
  {
    id: '3',
    title: 'Handstand\nMastery',
    sub: 'Balance, control and body awareness',
    tag: 'INTERMEDIATE',
    tagColor: '#F59E0B',
    imageUri: 'https://images.unsplash.com/photo-1517963879433-6ad2171073fb?w=900&q=80',
  },
];

const DRAWER_ITEMS = [
  { id: 'book', icon: '📅', label: 'Book Classes', tab: '/(tabs)/book' as const },
  { id: 'sub', icon: '💳', label: 'Pay a Subscription', tab: '/(tabs)/book' as const },
  { id: 'find', icon: '🔍', label: 'Find a Class for You', tab: '/(tabs)/classes' as const },
];

const QUICK_CLASSES = [
  { id: 'a', title: 'Pull-Up Power', trainer: 'Marco R.', time: '7:00 AM', spots: 5, diff: 'INT', color: '#A855F7' },
  { id: 'b', title: 'Core & Control', trainer: 'Sofia M.', time: '9:00 AM', spots: 12, diff: 'BEG', color: '#22D3EE' },
  { id: 'c', title: 'Ring Muscle Up', trainer: 'Carlos V.', time: '6:00 PM', spots: 3, diff: 'ADV', color: '#F59E0B' },
];

export function HomeScreen() {
  const [slide, setSlide] = useState(0);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const drawerX = useRef(new Animated.Value(-DRAWER_W)).current;
  const overlayAlpha = useRef(new Animated.Value(0)).current;
  const router = useRouter();
  const { displayName } = useAuthState();

  const openDrawer = () => {
    setDrawerOpen(true);
    Animated.parallel([
      Animated.spring(drawerX, { toValue: 0, useNativeDriver: true, bounciness: 0, speed: 20 }),
      Animated.timing(overlayAlpha, { toValue: 1, duration: 220, useNativeDriver: true }),
    ]).start();
  };

  const closeDrawer = () => {
    Animated.parallel([
      Animated.spring(drawerX, { toValue: -DRAWER_W, useNativeDriver: true, bounciness: 0, speed: 20 }),
      Animated.timing(overlayAlpha, { toValue: 0, duration: 180, useNativeDriver: true }),
    ]).start(() => setDrawerOpen(false));
  };

  const handleDrawerNav = (tab: '/(tabs)/book' | '/(tabs)/classes') => {
    closeDrawer();
    setTimeout(() => router.push(tab), 200);
  };

  const onHeroScroll = (e: any) => {
    const idx = Math.round(e.nativeEvent.contentOffset.x / SW);
    setSlide(idx);
  };

  const greeting = (() => {
    const h = new Date().getHours();
    if (h < 12) return 'Good morning';
    if (h < 18) return 'Good afternoon';
    return 'Good evening';
  })();

  return (
    <View style={s.root}>
      <StatusBar barStyle="light-content" backgroundColor="#0A0A0A" />

      <SafeAreaView style={{ flex: 1 }} edges={['top']}>
        {/* Header */}
        <View style={s.header}>
          <Pressable style={s.burger} onPress={openDrawer} accessibilityLabel="Open menu">
            <View style={s.burgerLine} />
            <View style={[s.burgerLine, { width: 20 }]} />
            <View style={[s.burgerLine, { width: 14 }]} />
          </Pressable>
          <Text style={s.logo}>CALI<Text style={s.logoAccent}>FIT</Text></Text>
          <Pressable style={s.notifBtn}>
            <Text style={{ fontSize: 20 }}>🔔</Text>
          </Pressable>
        </View>

        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 24 }}>
          {/* Greeting */}
          <View style={s.greet}>
            <Text style={s.greetSub}>{greeting},</Text>
            <Text style={s.greetName}>{displayName || 'Athlete'} 👊</Text>
          </View>

          {/* Hero Carousel */}
          <FlatList
            data={HERO_SLIDES}
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            keyExtractor={i => i.id}
            onScroll={onHeroScroll}
            scrollEventThrottle={16}
            renderItem={({ item }) => (
              <Pressable style={s.heroCard} onPress={() => router.push('/(tabs)/classes')}>
                <Image source={{ uri: item.imageUri }} style={s.heroImage} resizeMode="cover" />
                <View style={s.heroOverlay} />
                <View style={s.heroContent}>
                  <View style={[s.heroBadge, { borderColor: item.tagColor }]}>
                    <Text style={[s.heroBadgeText, { color: item.tagColor }]}>{item.tag}</Text>
                  </View>
                  <Text style={s.heroTitle}>{item.title}</Text>
                  <Text style={s.heroSub}>{item.sub}</Text>
                  <Pressable style={[s.heroBtn, { borderColor: item.tagColor }]} onPress={() => router.push('/(tabs)/classes')}>
                    <Text style={[s.heroBtnText, { color: item.tagColor }]}>Explore Class →</Text>
                  </Pressable>
                </View>
              </Pressable>
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
            {[
              { label: 'Classes\nBooked', val: '12' },
              { label: 'This\nWeek', val: '3' },
              { label: 'Day\nStreak', val: '7🔥' },
            ].map((st, i) => (
              <View key={i} style={s.statCard}>
                <Text style={s.statVal}>{st.val}</Text>
                <Text style={s.statLabel}>{st.label}</Text>
              </View>
            ))}
          </View>

          {/* Section header */}
          <View style={s.sectionRow}>
            <Text style={s.sectionTitle}>Today's Classes</Text>
            <Pressable onPress={() => router.push('/(tabs)/classes')}>
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
            {['All', 'Strength', 'Mobility', 'Cardio', 'Yoga'].map((c, i) => (
              <Pressable key={c} style={[s.chip, i === 0 && s.chipActive]}>
                <Text style={[s.chipText, i === 0 && s.chipTextActive]}>{c}</Text>
              </Pressable>
            ))}
          </ScrollView>

          {/* Mini class cards */}
          <View style={{ paddingHorizontal: 20, gap: 12 }}>
            {QUICK_CLASSES.map(c => (
              <Pressable
                key={c.id}
                style={({ pressed }) => [s.miniCard, pressed && { opacity: 0.75 }]}
                onPress={() => router.push({ pathname: '/book-class', params: { classId: c.id, className: c.title } })}
              >
                <View style={[s.miniAccent, { backgroundColor: c.color }]} />
                <View style={{ flex: 1, paddingLeft: 14 }}>
                  <Text style={s.miniTitle}>{c.title}</Text>
                  <Text style={s.miniSub}>{c.trainer} · {c.time}</Text>
                </View>
                <View style={{ alignItems: 'flex-end', gap: 4 }}>
                  <View style={[s.diffBadge, { backgroundColor: c.color + '22', borderColor: c.color + '55' }]}>
                    <Text style={[s.diffText, { color: c.color }]}>{c.diff}</Text>
                  </View>
                  <Text style={s.spotsText}>{c.spots} spots</Text>
                </View>
              </Pressable>
            ))}
          </View>
        </ScrollView>
      </SafeAreaView>

      {/* Drawer Overlay */}
      {drawerOpen && (
        <Animated.View style={[StyleSheet.absoluteFill, s.overlay, { opacity: overlayAlpha }]} pointerEvents="box-none">
          <Pressable style={StyleSheet.absoluteFill} onPress={closeDrawer} />
        </Animated.View>
      )}

      {/* Drawer Panel */}
      <Animated.View style={[s.drawer, { transform: [{ translateX: drawerX }] }]}>
        <SafeAreaView style={{ flex: 1 }} edges={['top', 'bottom']}>
          <View style={s.drawerHead}>
            <Text style={s.drawerLogo}>CALI<Text style={s.drawerLogoAccent}>FIT</Text></Text>
            <Pressable onPress={closeDrawer} style={s.drawerClose}>
              <Text style={s.drawerCloseText}>✕</Text>
            </Pressable>
          </View>
          <View style={s.drawerDivider} />
          <View style={{ paddingHorizontal: 24, marginTop: 16, marginBottom: 8 }}>
            <Text style={s.drawerGreet}>Hey, {displayName || 'Athlete'}</Text>
            <Text style={s.drawerGreetSub}>What do you want to do today?</Text>
          </View>
          <View style={{ paddingHorizontal: 16, marginTop: 8, gap: 4 }}>
            {DRAWER_ITEMS.map(item => (
              <Pressable
                key={item.id}
                style={({ pressed }) => [s.drawerItem, pressed && s.drawerItemPressed]}
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
            style={({ pressed }) => [s.drawerProfileBtn, pressed && { opacity: 0.7 }]}
            onPress={() => { closeDrawer(); setTimeout(() => router.push('/(tabs)/profile'), 200); }}
          >
            <View style={s.drawerAvatar}>
              <Text style={{ color: '#22D3EE', fontWeight: '700', fontSize: 18 }}>
                {(displayName || 'A')[0].toUpperCase()}
              </Text>
            </View>
            <View style={{ flex: 1, marginLeft: 12 }}>
              <Text style={s.drawerProfileName}>{displayName || 'My Account'}</Text>
              <Text style={s.drawerProfileSub}>View profile →</Text>
            </View>
          </Pressable>
        </SafeAreaView>
      </Animated.View>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#0A0A0A' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 12 },
  burger: { gap: 5, padding: 4 },
  burgerLine: { width: 24, height: 2, backgroundColor: '#FFFFFF', borderRadius: 2 },
  logo: { fontSize: 20, fontWeight: '900', color: '#FFFFFF', letterSpacing: 4 },
  logoAccent: { color: '#22D3EE' },
  notifBtn: { padding: 4 },
  greet: { paddingHorizontal: 20, marginTop: 4, marginBottom: 20 },
  greetSub: { color: '#666', fontSize: 14 },
  greetName: { color: '#FFF', fontSize: 26, fontWeight: '800', marginTop: 2 },
  heroCard: { width: SW, height: 280, position: 'relative' },
  heroImage: { ...StyleSheet.absoluteFillObject },
  heroOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: '#000', opacity: 0.55 },
  heroContent: { position: 'absolute', bottom: 0, left: 0, right: 0, padding: 24, gap: 6 },
  heroBadge: { alignSelf: 'flex-start', borderWidth: 1, borderRadius: 4, paddingHorizontal: 8, paddingVertical: 2 },
  heroBadgeText: { fontSize: 10, fontWeight: '800', letterSpacing: 1.5 },
  heroTitle: { color: '#FFF', fontSize: 28, fontWeight: '900', lineHeight: 34 },
  heroSub: { color: 'rgba(255,255,255,0.7)', fontSize: 13 },
  heroBtn: { alignSelf: 'flex-start', marginTop: 4, borderWidth: 1, borderRadius: 8, paddingHorizontal: 14, paddingVertical: 7 },
  heroBtnText: { fontSize: 13, fontWeight: '700' },
  dots: { flexDirection: 'row', justifyContent: 'center', gap: 6, marginTop: 14, marginBottom: 20 },
  dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#333' },
  dotActive: { backgroundColor: '#22D3EE', width: 20 },
  statsRow: { flexDirection: 'row', marginHorizontal: 20, gap: 10, marginBottom: 28 },
  statCard: { flex: 1, backgroundColor: '#141414', borderRadius: 14, alignItems: 'center', paddingVertical: 16, borderWidth: 1, borderColor: '#222' },
  statVal: { color: '#22D3EE', fontSize: 22, fontWeight: '800' },
  statLabel: { color: '#666', fontSize: 11, textAlign: 'center', marginTop: 4, lineHeight: 16 },
  sectionRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, marginBottom: 14 },
  sectionTitle: { color: '#FFF', fontSize: 17, fontWeight: '800' },
  sectionLink: { color: '#22D3EE', fontSize: 13, fontWeight: '600' },
  chip: { borderWidth: 1, borderColor: '#2A2A2A', borderRadius: 20, paddingHorizontal: 16, paddingVertical: 7, backgroundColor: '#141414' },
  chipActive: { backgroundColor: '#22D3EE', borderColor: '#22D3EE' },
  chipText: { color: '#888', fontSize: 13, fontWeight: '600' },
  chipTextActive: { color: '#000' },
  miniCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#141414', borderRadius: 14, padding: 16, borderWidth: 1, borderColor: '#1E1E1E' },
  miniAccent: { width: 4, height: 44, borderRadius: 2 },
  miniTitle: { color: '#FFF', fontSize: 15, fontWeight: '700' },
  miniSub: { color: '#666', fontSize: 12, marginTop: 3 },
  diffBadge: { borderWidth: 1, borderRadius: 4, paddingHorizontal: 6, paddingVertical: 2 },
  diffText: { fontSize: 10, fontWeight: '800', letterSpacing: 0.5 },
  spotsText: { color: '#555', fontSize: 11 },
  overlay: { backgroundColor: '#000', zIndex: 10 },
  drawer: { position: 'absolute', top: 0, left: 0, bottom: 0, width: DRAWER_W, backgroundColor: '#0E0E0E', zIndex: 20, borderRightWidth: 1, borderRightColor: '#1E1E1E', shadowColor: '#000', shadowOffset: { width: 4, height: 0 }, shadowOpacity: 0.5, shadowRadius: 16, elevation: 20 },
  drawerHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 24, paddingTop: 8, paddingBottom: 16 },
  drawerLogo: { fontSize: 22, fontWeight: '900', color: '#FFF', letterSpacing: 4 },
  drawerLogoAccent: { color: '#22D3EE' },
  drawerClose: { width: 32, height: 32, borderRadius: 16, backgroundColor: '#1E1E1E', alignItems: 'center', justifyContent: 'center' },
  drawerCloseText: { color: '#888', fontSize: 14 },
  drawerDivider: { height: 1, backgroundColor: '#1A1A1A', marginHorizontal: 24 },
  drawerGreet: { color: '#FFF', fontSize: 18, fontWeight: '800' },
  drawerGreetSub: { color: '#555', fontSize: 13, marginTop: 2 },
  drawerItem: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingHorizontal: 12, paddingVertical: 16, borderRadius: 12 },
  drawerItemPressed: { backgroundColor: '#1A1A1A' },
  drawerItemIcon: { fontSize: 20, width: 28 },
  drawerItemLabel: { flex: 1, color: '#DDD', fontSize: 15, fontWeight: '600' },
  drawerItemArrow: { color: '#444', fontSize: 22 },
  drawerProfileBtn: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 24, paddingVertical: 20 },
  drawerAvatar: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#0F2A2E', borderWidth: 1, borderColor: '#22D3EE44', alignItems: 'center', justifyContent: 'center' },
  drawerProfileName: { color: '#FFF', fontSize: 15, fontWeight: '700' },
  drawerProfileSub: { color: '#22D3EE', fontSize: 12, marginTop: 2 },
});
