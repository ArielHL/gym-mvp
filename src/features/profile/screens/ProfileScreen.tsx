import {
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  StatusBar,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useAuthState } from "@/features/auth/hooks/useAuthState";
import { authService } from "@/features/auth/services/authService";
import { useRouter } from "expo-router";

const MENU_ITEMS = [
  {
    id: "edit",
    icon: "✏️",
    label: "Edit Profile",
    sub: "Update your name and photo",
  },
  {
    id: "notif",
    icon: "🔔",
    label: "Notifications",
    sub: "Manage push preferences",
  },
  {
    id: "plan",
    icon: "💳",
    label: "My Subscription",
    sub: "View and manage your plan",
  },
  {
    id: "history",
    icon: "📅",
    label: "Booking History",
    sub: "Past and upcoming classes",
  },
  {
    id: "help",
    icon: "🤝",
    label: "Help & Support",
    sub: "FAQ and contact us",
  },
];

function Avatar({ name }: { name: string }) {
  const initials = name
    .split(" ")
    .map((w) => w[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
  return (
    <View style={s.avatar}>
      <Text style={s.avatarText}>{initials || "?"}</Text>
    </View>
  );
}

export function ProfileScreen() {
  const { user, role, displayName } = useAuthState();
  const router = useRouter();

  const onLogout = () => {
    Alert.alert("Sign out", "Are you sure you want to sign out?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Sign Out",
        style: "destructive",
        onPress: async () => {
          try {
            await authService.logout();
          } catch (err) {
            Alert.alert("Error", (err as Error).message);
          }
        },
      },
    ]);
  };

  if (!user) {
    return (
      <SafeAreaView style={s.root} edges={["top"]}>
        <StatusBar barStyle="light-content" backgroundColor="#0A0A0A" />
        <View style={s.center}>
          <Text style={{ fontSize: 56 }}>🔒</Text>
          <Text style={s.signInTitle}>Sign in to access{"\n"}your account</Text>
          <Text style={s.signInSub}>
            Track bookings, manage your plan, and more
          </Text>
          <Pressable style={s.signInBtn} onPress={() => router.push("/auth")}>
            <Text style={s.signInBtnText}>Sign In</Text>
          </Pressable>
          <Pressable
            style={s.registerBtn}
            onPress={() => router.push("/register")}
          >
            <Text style={s.registerBtnText}>Create Account</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={s.root} edges={["top"]}>
      <StatusBar barStyle="light-content" backgroundColor="#0A0A0A" />
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 40 }}
      >
        {/* Header banner */}
        <View style={s.banner}>
          <View style={s.bannerPattern} />
          <View style={s.bannerContent}>
            <Avatar name={displayName} />
            <Text style={s.displayName}>{displayName || "Athlete"}</Text>
            <Text style={s.email}>{user.email}</Text>
            <View style={[s.roleBadge, role === "admin" && s.roleBadgeAdmin]}>
              <Text style={[s.roleText, role === "admin" && s.roleTextAdmin]}>
                {role === "admin" ? "⭐ Admin" : "🏋️ Member"}
              </Text>
            </View>
          </View>
        </View>

        {/* Stats row */}
        <View style={s.statsRow}>
          {[
            { label: "Classes\nBooked", val: "24", color: "#22D3EE" },
            { label: "This\nMonth", val: "6", color: "#A855F7" },
            { label: "Day\nStreak", val: "7🔥", color: "#F59E0B" },
          ].map((st, i) => (
            <View key={i} style={s.statCard}>
              <Text style={[s.statVal, { color: st.color }]}>{st.val}</Text>
              <Text style={s.statLabel}>{st.label}</Text>
            </View>
          ))}
        </View>

        {/* Membership card */}
        <View style={s.memberCard}>
          <View>
            <Text style={s.memberLabel}>Current Plan</Text>
            <Text style={s.memberPlan}>Premium Membership</Text>
          </View>
          <Pressable style={s.upgradeBtn}>
            <Text style={s.upgradeBtnText}>Upgrade</Text>
          </Pressable>
        </View>

        {/* Menu items */}
        <View style={s.menuSection}>
          <Text style={s.menuSectionTitle}>Account</Text>
          {MENU_ITEMS.map((item, i) => (
            <Pressable
              key={item.id}
              style={({ pressed }) => [
                s.menuItem,
                i === 0 && s.menuItemFirst,
                i === MENU_ITEMS.length - 1 && s.menuItemLast,
                pressed && { backgroundColor: "#1A1A1A" },
              ]}
            >
              <View style={s.menuItemContent}>
                <View style={s.menuItemLeft}>
                  <View style={s.menuIconWrap}>
                    <Text style={s.menuIcon}>{item.icon}</Text>
                  </View>
                  <View style={s.menuText}>
                    <Text style={s.menuLabel}>{item.label}</Text>
                    <Text style={s.menuSub}>{item.sub}</Text>
                  </View>
                </View>

                <Text style={s.menuArrow}>›</Text>
              </View>
            </Pressable>
          ))}
        </View>

        {/* Sign out */}
        <View
          style={{
            marginHorizontal: 20,
            marginTop: 24,
            alignContent: "center",
            justifyContent: "center",
          }}
        >
          <Pressable
            style={({ pressed }) => [s.logoutBtn, pressed && { opacity: 0.75 }]}
            onPress={onLogout}
          >
            <Text style={s.logoutText}>Sign Out</Text>
          </Pressable>
        </View>

        {/* App version */}
        <Text style={s.version}>CaliFit · v1.0.0</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#0A0A0A" },
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 32,
    gap: 12,
  },
  signInTitle: {
    color: "#FFF",
    fontSize: 24,
    fontWeight: "800",
    textAlign: "center",
    lineHeight: 32,
    marginTop: 16,
  },
  signInSub: {
    color: "#555",
    fontSize: 14,
    textAlign: "center",
    lineHeight: 20,
  },
  signInBtn: {
    width: "100%",
    height: 54,
    backgroundColor: "#22D3EE",
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 8,
  },
  signInBtnText: { color: "#000", fontSize: 16, fontWeight: "800" },
  registerBtn: {
    width: "100%",
    height: 54,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#2A2A2A",
  },
  registerBtnText: { color: "#FFF", fontSize: 16, fontWeight: "600" },
  banner: {
    backgroundColor: "#141414",
    paddingTop: 24,
    paddingBottom: 28,
    borderBottomWidth: 1,
    borderBottomColor: "#1E1E1E",
    overflow: "hidden",
    position: "relative",
  },
  bannerPattern: {
    position: "absolute",
    top: -40,
    right: -40,
    width: 180,
    height: 180,
    borderRadius: 90,
    backgroundColor: "#22D3EE08",
  },
  bannerContent: { alignItems: "center", gap: 6 },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: "#0F2A2E",
    borderWidth: 2,
    borderColor: "#22D3EE44",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 6,
  },
  avatarText: { color: "#22D3EE", fontSize: 28, fontWeight: "800" },
  displayName: { color: "#FFF", fontSize: 22, fontWeight: "800" },
  email: { color: "#666", fontSize: 13 },
  roleBadge: {
    marginTop: 4,
    paddingHorizontal: 14,
    paddingVertical: 5,
    backgroundColor: "#22D3EE22",
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#22D3EE33",
  },
  roleBadgeAdmin: { backgroundColor: "#A855F722", borderColor: "#A855F733" },
  roleText: { color: "#22D3EE", fontSize: 12, fontWeight: "700" },
  roleTextAdmin: { color: "#A855F7" },
  statsRow: {
    flexDirection: "row",
    marginHorizontal: 20,
    marginTop: 20,
    gap: 10,
  },
  statCard: {
    flex: 1,
    backgroundColor: "#141414",
    borderRadius: 14,
    alignItems: "center",
    paddingVertical: 16,
    borderWidth: 1,
    borderColor: "#1E1E1E",
  },
  statVal: { fontSize: 22, fontWeight: "800" },
  statLabel: {
    color: "#555",
    fontSize: 11,
    textAlign: "center",
    marginTop: 4,
    lineHeight: 16,
  },
  memberCard: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginHorizontal: 20,
    marginTop: 16,
    backgroundColor: "#141414",
    borderRadius: 14,
    padding: 18,
    borderWidth: 1,
    borderColor: "#1E1E1E",
  },
  memberLabel: { color: "#555", fontSize: 12 },
  memberPlan: { color: "#FFF", fontSize: 15, fontWeight: "700", marginTop: 2 },
  upgradeBtn: {
    backgroundColor: "#22D3EE",
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 10,
  },
  upgradeBtnText: { color: "#000", fontSize: 13, fontWeight: "800" },
  menuSection: { marginHorizontal: 20, marginTop: 24 },
  menuSectionTitle: {
    color: "#444",
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 1,
    marginBottom: 8,
    textTransform: "uppercase",
  },
  menuItem: {
    backgroundColor: "#141414",
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderTopWidth: 1,
    borderTopColor: "#1E1E1E",
    borderRadius: 14,
    marginBottom: 8,
  },
  menuItemFirst: {
    borderTopLeftRadius: 14,
    borderTopRightRadius: 14,
    borderTopWidth: 1,
    borderTopColor: "#1E1E1E",
  },
  menuItemLast: { borderBottomLeftRadius: 14, borderBottomRightRadius: 14 },
  menuItemContent: {
    flexDirection: "row",
    marginBottom: 15,
    alignItems: "center",
    justifyContent: "space-between",
  },
  menuItemLeft: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    marginRight: 12,
  },
  menuIconWrap: {
    width: 32,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  menuIcon: { fontSize: 20, lineHeight: 24, textAlign: "center" },
  menuText: { flex: 1, justifyContent: "center" },
  menuLabel: { color: "#FFF", fontSize: 14, fontWeight: "600" },
  menuSub: { color: "#555", fontSize: 12, marginTop: 2 },
  menuArrow: { color: "#333", fontSize: 22, lineHeight: 24 },
  logoutBtn: {
    marginHorizontal: 20,
    marginTop: 24,
    height: 52,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#EF444433",
    backgroundColor: "#EF444411",
  },
  logoutText: { color: "#EF4444", fontSize: 15, fontWeight: "700" },
  version: { color: "#333", fontSize: 12, textAlign: "center", marginTop: 20 },
});
