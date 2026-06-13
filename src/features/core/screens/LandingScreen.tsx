import { useState } from 'react';
import {
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

const { width: SW } = Dimensions.get('window');

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

const QUICK_CLASSES = [
  { id: 'a', title: 'Pull-Up Power', trainer: 'Marco R.', time: '7:00 AM', spots: 5, diff: 'INT', color: '#A855F7' },
  { id: 'b', title: 'Core & Control', trainer: 'Sofia M.', time: '9:00 AM', spots: 12, diff: 'BEG', color: '#22D3EE' },
  { id: 'c', title: 'Ring Muscle Up', trainer: 'Carlos V.', time: '6:00 PM', spots: 3, diff: 'ADV', color: '#F59E0B' },
];

type TabRoute = '/(tabs)/index' | '/(tabs)/classes' | '/(tabs)/book' | '/(tabs)/profile';

export function LandingScreen() {
  const [slide, setSlide] = useState(0);
  const router = useRouter();

  const goToTab = (route: TabRoute) => {
    router.push(route);
  };

  const onHeroScroll = (e: any) => {
    const idx = Math.round(e.nativeEvent.contentOffset.x / SW);
    setSlide(idx);
  };

  return (
    <View style={s.root}>
      <StatusBar barStyle="light-content" backgroundColor="#0A0A0A" />

      {/* Top content area */}
      <SafeAreaView style={{ flex: 1 }} edges={['top']}>
        {/* Header */}
        <View style={s.header}>
          <Pressable style={s.burger} onPress={() => goToTab('/(tabs)/index')} accessibilityLabel="Go to home tab">
            <View style={s.burgerLine} />
            <View style={[s.burgerLine, { width: 20 }]} />
            <View style={[s.burgerLine, { width: 14 }]} />
          </Pressable>
          <Text style={s.logo}>CALI<Text style={s.logoAccent}>FIT</Text></Text>
          <Pressable style={s.notifBtn} onPress={() => goToTab('/(tabs)/profile')} accessibilityLabel="Go to profile tab">
            <Text style={{ fontSize: 20 }}>🔔</Text>
          </Pressable>
        </View>

        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 24 }}>
          {/* Greeting */}
          <View style={s.greet}>
            <Text style={s.greetSub}>Welcome to</Text>
            <Text style={s.greetName}>CaliFit 👊</Text>
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
              <View style={s.heroCard}>
                <Image source={{ uri: item.imageUri }} style={s.heroImage} resizeMode="cover" />
                <View style={s.heroOverlay} />
                <View style={s.heroContent}>
                  <View style={[s.heroBadge, { borderColor: item.tagColor }]}>
                    <Text style={[s.heroBadgeText, { color: item.tagColor }]}>{item.tag}</Text>
                  </View>
                  <Text style={s.heroTitle}>{item.title}</Text>
                  <Text style={s.heroSub}>{item.sub}</Text>
                  <Pressable
                    style={[s.heroBtn, { borderColor: item.tagColor }]}
                    onPress={() => goToTab('/(tabs)/classes')}
                    accessibilityLabel="Explore classes tab"
                  >
                    <Text style={[s.heroBtnText, { color: item.tagColor }]}>Sign in to explore →</Text>
                  </Pressable>
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
            {[
              { label: 'Classes\nAvailable', val: '24+' },
              { label: 'Expert\nTrainers', val: '8' },
              { label: 'Weekly\nSessions', val: '30+' },
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
            <Pressable onPress={() => goToTab('/(tabs)/classes')} accessibilityLabel="See all classes">
              <Text style={s.sectionLinkGhost}>See all →</Text>
            </Pressable>
          </View>

          {/* Mini class cards */}
          <View style={{ paddingHorizontal: 20, gap: 12 }}>
            {QUICK_CLASSES.map(c => (
              <View key={c.id} style={s.miniCard}>
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
              </View>
            ))}
          </View>
        </ScrollView>
      </SafeAreaView>

      {/* Sticky auth buttons — always visible above system nav bar */}
      <SafeAreaView style={s.authBar} edges={['bottom']}>
        <View style={s.authButtons}>
          <Pressable
            style={({ pressed }) => [s.btnPrimary, pressed && s.pressed]}
            onPress={() => router.push('/auth')}
          >
            <Text style={s.btnPrimaryText}>Sign In</Text>
          </Pressable>
          <Pressable
            style={({ pressed }) => [s.btnSecondary, pressed && s.pressed]}
            onPress={() => router.push('/register')}
          >
            <Text style={s.btnSecondaryText}>Create Account</Text>
          </Pressable>
        </View>
      </SafeAreaView>
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
  sectionLinkGhost: { color: '#555', fontSize: 13, fontWeight: '600' },
  miniCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#141414', borderRadius: 14, padding: 16, borderWidth: 1, borderColor: '#1E1E1E' },
  miniAccent: { width: 4, height: 44, borderRadius: 2 },
  miniTitle: { color: '#FFF', fontSize: 15, fontWeight: '700' },
  miniSub: { color: '#666', fontSize: 12, marginTop: 3 },
  diffBadge: { borderWidth: 1, borderRadius: 4, paddingHorizontal: 6, paddingVertical: 2 },
  diffText: { fontSize: 10, fontWeight: '800', letterSpacing: 0.5 },
  spotsText: { color: '#555', fontSize: 11 },
  // Sticky auth bar
  authBar: { backgroundColor: '#0E0E0E', borderTopWidth: 1, borderTopColor: '#1A1A1A' },
  authButtons: { paddingHorizontal: 20, paddingTop: 12, paddingBottom: 8, gap: 10 },
  btnPrimary: { height: 52, backgroundColor: '#22D3EE', borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  btnPrimaryText: { color: '#000000', fontSize: 16, fontWeight: '700', letterSpacing: 0.5 },
  btnSecondary: { height: 52, borderRadius: 12, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#333333' },
  btnSecondaryText: { color: '#ffffff', fontSize: 16, fontWeight: '600' },
  pressed: { opacity: 0.7 },
});
