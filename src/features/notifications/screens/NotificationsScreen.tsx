import { useMemo } from "react";
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  RefreshControl,
  StatusBar,
  StyleSheet,
  View,
} from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { Text } from "@/components/ui/Text";
import { AuthRequiredView } from "@/features/auth/components/AuthRequiredView";
import { useAuthState } from "@/features/auth/hooks/useAuthState";
import { colors, fontStyle, withAlpha } from "@/theme";
import type { AppNotification, AppNotificationType } from "@/types/models";
import {
  useMarkAllNotificationsRead,
  useMarkNotificationRead,
  useNotificationFeed,
} from "../hooks/useNotificationFeed";

const notificationIcon: Record<AppNotificationType, keyof typeof MaterialCommunityIcons.glyphMap> = {
  booking_confirmed: "calendar-check",
  booking_cancelled: "calendar-remove",
  general: "bell-outline",
};

const notificationColor: Record<AppNotificationType, string> = {
  booking_confirmed: colors.success,
  booking_cancelled: colors.accent.amber,
  general: colors.accent.cyan,
};

function formatTimestamp(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";

  return date.toLocaleString("es-AR", {
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    month: "short",
  });
}

export function NotificationsScreen() {
  const router = useRouter();
  const { user } = useAuthState();
  const { data, isError, isLoading, isRefetching, refetch } = useNotificationFeed();
  const markRead = useMarkNotificationRead();
  const markAllRead = useMarkAllNotificationsRead();
  const notifications = data ?? [];

  const unreadCount = useMemo(
    () => notifications.filter((item) => !item.read_at).length,
    [notifications],
  );

  const onPressNotification = (item: AppNotification) => {
    if (!item.read_at && !markRead.isPending) {
      markRead.mutate(item.id);
    }
  };

  return (
    <SafeAreaView style={styles.root}>
      <StatusBar barStyle="light-content" backgroundColor={colors.inverse} />

      <View style={styles.header}>
        <Pressable
          style={({ pressed }) => [styles.backBtn, pressed && { opacity: 0.75 }]}
          onPress={() => router.back()}
          accessibilityLabel="Volver"
        >
          <MaterialCommunityIcons
            name="chevron-left"
            size={28}
            color={colors.accent.cyan}
          />
        </Pressable>
        <View style={styles.headerCopy}>
          <Text variant="title" style={styles.heading}>Notificaciones</Text>
          <Text style={styles.subheading}>
            {!user
              ? "Inicia sesión para verlas"
              : unreadCount > 0
                ? `${unreadCount} sin leer`
                : "Estás al día con tus novedades"}
          </Text>
        </View>
        {unreadCount > 0 ? (
          <Pressable
            style={({ pressed }) => [
              styles.markAllBtn,
              (pressed || markAllRead.isPending) && { opacity: 0.65 },
            ]}
            disabled={markAllRead.isPending}
            onPress={() => markAllRead.mutate()}
            accessibilityLabel="Marcar todas las notificaciones como leídas"
          >
            <Text style={styles.markAllText}>Leer</Text>
          </Pressable>
        ) : null}
      </View>

      <View style={styles.divider} />

      {!user ? (
        <AuthRequiredView
          title="Inicia sesión para ver tus notificaciones"
          subtitle="Las confirmaciones y cancelaciones de reservas aparecen acá."
        />
      ) : null}

      {user && isLoading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.accent.cyan} />
        </View>
      ) : null}

      {user && isError ? (
        <View style={styles.center}>
          <Text style={styles.errorText}>No se pudieron cargar las notificaciones.</Text>
          <Pressable style={styles.retryBtn} onPress={() => refetch()}>
            <Text style={styles.retryText}>Reintentar</Text>
          </Pressable>
        </View>
      ) : null}

      {user && !isLoading && !isError ? (
        <FlatList
          data={notifications}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={isRefetching}
              tintColor={colors.accent.cyan}
              onRefresh={refetch}
            />
          }
          ListEmptyComponent={
            <View style={styles.emptyCard}>
              <View style={styles.emptyIcon}>
                <MaterialCommunityIcons
                  name="bell-sleep-outline"
                  size={28}
                  color={colors.accent.cyan}
                />
              </View>
              <Text style={styles.emptyTitle}>Sin notificaciones</Text>
              <Text style={styles.emptyHint}>
                Las confirmaciones y cancelaciones de reservas van a aparecer acá.
              </Text>
            </View>
          }
          renderItem={({ item }) => {
            const unread = !item.read_at;
            const accent = notificationColor[item.type] ?? colors.accent.cyan;

            return (
              <Pressable
                style={({ pressed }) => [
                  styles.card,
                  unread && styles.unreadCard,
                  pressed && { opacity: 0.78 },
                ]}
                onPress={() => onPressNotification(item)}
                accessibilityLabel={`Notificación: ${item.title}`}
              >
                <View style={[styles.iconWrap, { borderColor: withAlpha(accent, "44") }]}>
                  <MaterialCommunityIcons
                    name={notificationIcon[item.type] ?? "bell-outline"}
                    size={22}
                    color={accent}
                  />
                </View>
                <View style={styles.cardCopy}>
                  <View style={styles.cardTopRow}>
                    <Text style={[styles.cardTitle, unread && styles.unreadTitle]}>
                      {item.title}
                    </Text>
                    {unread ? <View style={styles.unreadDot} /> : null}
                  </View>
                  <Text style={styles.cardBody}>{item.body}</Text>
                  <Text style={styles.cardTime}>{formatTimestamp(item.created_at)}</Text>
                </View>
              </Pressable>
            );
          }}
        />
      ) : null}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.inverse },
  header: {
    alignItems: "center",
    flexDirection: "row",
    gap: 12,
    paddingHorizontal: 20,
    paddingVertical: 14,
  },
  backBtn: {
    alignItems: "center",
    backgroundColor: colors.surface.DEFAULT,
    borderColor: colors.border,
    borderRadius: 19,
    borderWidth: 1,
    height: 38,
    justifyContent: "center",
    width: 38,
  },
  headerCopy: { flex: 1 },
  heading: {
    color: colors.foreground,
    fontSize: 24,
    fontWeight: "900",
    ...fontStyle.title,
  },
  subheading: { color: colors.muted, fontSize: 14, marginTop: 4 },
  markAllBtn: {
    backgroundColor: withAlpha(colors.accent.cyan, "18"),
    borderColor: withAlpha(colors.accent.cyan, "55"),
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  markAllText: { color: colors.accent.cyan, fontSize: 12, fontWeight: "800" },
  divider: {
    backgroundColor: colors.surface.elevated,
    height: 1,
    marginHorizontal: 16,
  },
  list: { paddingBottom: 32, paddingHorizontal: 16, paddingTop: 16 },
  card: {
    alignItems: "flex-start",
    backgroundColor: colors.background,
    borderColor: colors.border,
    borderRadius: 18,
    borderWidth: 1,
    flexDirection: "row",
    gap: 14,
    marginBottom: 12,
    padding: 16,
  },
  unreadCard: {
    backgroundColor: withAlpha(colors.accent.cyan, "0d"),
    borderColor: withAlpha(colors.accent.cyan, "33"),
  },
  iconWrap: {
    alignItems: "center",
    backgroundColor: colors.surface.DEFAULT,
    borderRadius: 16,
    borderWidth: 1,
    height: 42,
    justifyContent: "center",
    width: 42,
  },
  cardCopy: { flex: 1 },
  cardTopRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: 8,
    justifyContent: "space-between",
  },
  cardTitle: { color: colors.foreground, flex: 1, fontSize: 16, fontWeight: "700" },
  unreadTitle: { color: colors.accent.cyan, fontWeight: "900" },
  unreadDot: {
    backgroundColor: colors.accent.cyan,
    borderRadius: 5,
    height: 10,
    width: 10,
  },
  cardBody: { color: colors.muted, fontSize: 13, lineHeight: 19, marginTop: 6 },
  cardTime: { color: colors.faint, fontSize: 12, fontWeight: "600", marginTop: 10 },
  center: {
    alignItems: "center",
    flex: 1,
    justifyContent: "center",
    paddingHorizontal: 24,
    paddingVertical: 60,
  },
  errorText: { color: colors.danger, fontSize: 15, textAlign: "center" },
  retryBtn: {
    borderColor: withAlpha(colors.accent.cyan, "55"),
    borderRadius: 999,
    borderWidth: 1,
    marginTop: 16,
    paddingHorizontal: 16,
    paddingVertical: 9,
  },
  retryText: { color: colors.accent.cyan, fontSize: 13, fontWeight: "800" },
  emptyCard: {
    alignItems: "center",
    backgroundColor: colors.background,
    borderColor: colors.border,
    borderRadius: 20,
    borderWidth: 1,
    marginTop: 40,
    paddingHorizontal: 24,
    paddingVertical: 34,
  },
  emptyIcon: {
    alignItems: "center",
    backgroundColor: withAlpha(colors.accent.cyan, "12"),
    borderColor: withAlpha(colors.accent.cyan, "33"),
    borderRadius: 24,
    borderWidth: 1,
    height: 48,
    justifyContent: "center",
    width: 48,
  },
  emptyTitle: {
    color: colors.foreground,
    fontSize: 17,
    fontWeight: "900",
    marginTop: 16,
  },
  emptyHint: {
    color: colors.muted,
    fontSize: 13,
    lineHeight: 19,
    marginTop: 6,
    textAlign: "center",
  },
});
