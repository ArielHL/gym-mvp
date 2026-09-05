import { View, ScrollView, Pressable, ActivityIndicator, StyleSheet } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useLocalSearchParams, useRouter } from "expo-router";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useAuthState } from "@/features/auth/hooks/useAuthState";
import { usePublicClassTemplate } from "@/features/classes/hooks/useClasses";

import { colors, fontStyle } from "@/theme";
import { Text } from "@/components/ui/Text";
const dayLabels = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];

function formatDays(mask: number): string {
  return dayLabels
    .filter((_, day) => (mask & (1 << day)) !== 0)
    .join(" + ");
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.row}>
      <Text style={styles.rowLabel}>{label}</Text>
      <Text style={styles.rowValue}>{value}</Text>
    </View>
  );
}

export function ClassDetailsScreen() {
  const { classId } = useLocalSearchParams<{ classId?: string }>();
  const router = useRouter();
  const { user } = useAuthState();
  const { data: template, isLoading, isError } = usePublicClassTemplate(classId);

  if (isLoading) {
    return (
      <SafeAreaView style={styles.root} edges={["top", "bottom"]}>
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.accent.cyan} />
          <Text style={styles.mutedText}>Loading class...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (isError || !template) {
    return (
      <SafeAreaView style={styles.root} edges={["top", "bottom"]}>
        <View style={styles.center}>
          <Text style={styles.errorText}>No se pudo cargar esta clase</Text>
        </View>
      </SafeAreaView>
    );
  }

  const onBook = () => {
    if (!user) {
      router.push("/(tabs)/bookings");
      return;
    }
    router.push({
      pathname: "/bookings/new",
      params: {
        templateId: template.id,
        className: template.title,
      },
    });
  };

  return (
    <SafeAreaView style={styles.root} edges={["top", "bottom"]}>
      <View style={styles.header}>
        <Pressable style={styles.backBtn} onPress={() => router.back()}>
          <MaterialCommunityIcons
            name="chevron-left"
            size={28}
            color={colors.accent.cyan}
          />
        </Pressable>
        <Text style={styles.headerTitle}>Detalles de la Clase</Text>
      </View>
      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
      >
        <Text variant="title" style={styles.title}>{template.title}</Text>
        <Text style={styles.desc}>{template.description}</Text>

        <View style={styles.infoCard}>
          <InfoRow label="Entrenador" value={template.trainer_name} />
          <InfoRow label="Tipo de ejercicio" value={template.class_type_nombre} />
          <InfoRow
            label="Duración"
            value={`${template.duration_minutes} min`}
          />
          <InfoRow label="Horario" value={formatDays(template.days_of_week_mask)} />
          <InfoRow label="Hora de inicio" value={template.start_time} />
          <InfoRow label="Dificultad" value={template.difficulty_level} />
          <InfoRow label="Ubicación" value={template.location_name} />
          <InfoRow label="Válido desde" value={template.valid_from} />
          <InfoRow label="Válido hasta" value={template.valid_until ?? "Sin fecha de fin"} />
        </View>

        <View style={styles.btnShell}>
          <Pressable
            style={({ pressed }) => [styles.btnPressable, pressed && styles.btnDisabled]}
            onPress={onBook}
          >
            <Text style={styles.btnText}>Elegir Fecha y Reservar</Text>
          </Pressable>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.inverse },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 8,
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
    marginRight: 12,
  },
  headerTitle: { color: colors.foreground, fontSize: 16, fontWeight: "800" },
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    padding: 20,
  },
  mutedText: { color: colors.muted, fontSize: 14 },
  errorText: { color: colors.danger, fontSize: 15, fontWeight: "700" },
  scroll: { paddingHorizontal: 20, paddingTop: 12, paddingBottom: 48 },
  title: { fontSize: 28, fontWeight: "900", color: colors.foreground, lineHeight: 34, ...fontStyle.title },
  desc: { fontSize: 15, color: colors.muted, marginTop: 8, lineHeight: 22 },
  infoCard: {
    backgroundColor: colors.background,
    borderRadius: 14,
    padding: 16,
    marginTop: 20,
    borderWidth: 1,
    borderColor: colors.border,
  },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: colors.surface.elevated,
  },
  rowLabel: { fontSize: 14, color: colors.muted },
  rowValue: {
    fontSize: 14,
    color: colors.foreground,
    fontWeight: "600",
    flex: 1,
    textAlign: "right",
    marginLeft: 12,
  },
  btnShell: {
    marginTop: 48,
    height: 54,
    backgroundColor: colors.accent.cyan,
    borderRadius: 12,
    overflow: "hidden",
    alignItems: "center",
    justifyContent: "center",
  },
  btnPressable: {
    alignItems: "center",
    justifyContent: "center",
  },
  btnDisabled: { opacity: 0.45 },
  btnText: { fontSize: 16, fontWeight: "700", color: colors.inverse },
});
