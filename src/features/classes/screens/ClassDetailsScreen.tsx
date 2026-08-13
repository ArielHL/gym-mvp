import {
  View,
  Text,
  ScrollView,
  Pressable,
  ActivityIndicator,
  StyleSheet,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useLocalSearchParams, useRouter } from "expo-router";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { usePublicClassTemplate } from "@/features/classes/hooks/useClasses";

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
  const { data: template, isLoading, isError } = usePublicClassTemplate(classId);

  if (isLoading) {
    return (
      <SafeAreaView style={styles.root} edges={["top", "bottom"]}>
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#22D3EE" />
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
            color="#22D3EE"
          />
        </Pressable>
        <Text style={styles.headerTitle}>Detalles de la Clase</Text>
      </View>
      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.title}>{template.title}</Text>
        <Text style={styles.desc}>{template.description}</Text>

        <View style={styles.infoCard}>
          <InfoRow label="Entrenador" value={template.trainer_name} />
          <InfoRow label="Tipo de ejercicio" value={template.exercise_type} />
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
  root: { flex: 1, backgroundColor: "#000000" },
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
    backgroundColor: "#141414",
    borderWidth: 1,
    borderColor: "#222222",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  headerTitle: { color: "#ffffff", fontSize: 16, fontWeight: "800" },
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    padding: 20,
  },
  mutedText: { color: "#666666", fontSize: 14 },
  errorText: { color: "#ef4444", fontSize: 15, fontWeight: "700" },
  scroll: { paddingHorizontal: 20, paddingTop: 12, paddingBottom: 48 },
  title: { fontSize: 28, fontWeight: "900", color: "#ffffff", lineHeight: 34 },
  desc: { fontSize: 15, color: "#666666", marginTop: 8, lineHeight: 22 },
  infoCard: {
    backgroundColor: "#111111",
    borderRadius: 14,
    padding: 16,
    marginTop: 20,
    borderWidth: 1,
    borderColor: "#222222",
  },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#1a1a1a",
  },
  rowLabel: { fontSize: 14, color: "#555555" },
  rowValue: {
    fontSize: 14,
    color: "#ffffff",
    fontWeight: "600",
    flex: 1,
    textAlign: "right",
    marginLeft: 12,
  },
  btnShell: {
    marginTop: 48,
    height: 54,
    backgroundColor: "#add8e6",
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
  btnText: { fontSize: 16, fontWeight: "700", color: "#000000" },
});
