import { useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Calendar, LocaleConfig } from "react-native-calendars";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Screen } from "@/components/ui/Screen";
import { queryKeys } from "@/constants/queryKeys";
import { useAuthState } from "@/features/auth/hooks/useAuthState";
import {
  type AdminSubscriptionInput,
  type AdminUser,
  createUserSubscription,
  fetchAdminUsers,
  subscriptionFor,
  updateUserSubscription,
} from "@/features/subscriptions/services/adminSubscriptionService";
import { toDateKey } from "@/utils/date";

LocaleConfig.locales.es = {
  monthNames: [
    "enero",
    "febrero",
    "marzo",
    "abril",
    "mayo",
    "junio",
    "julio",
    "agosto",
    "septiembre",
    "octubre",
    "noviembre",
    "diciembre",
  ],
  monthNamesShort: [
    "ene.",
    "feb.",
    "mar.",
    "abr.",
    "may.",
    "jun.",
    "jul.",
    "ago.",
    "sep.",
    "oct.",
    "nov.",
    "dic.",
  ],
  dayNames: [
    "domingo",
    "lunes",
    "martes",
    "miércoles",
    "jueves",
    "viernes",
    "sábado",
  ],
  dayNamesShort: ["dom.", "lun.", "mar.", "mié.", "jue.", "vie.", "sáb."],
  today: "Hoy",
};

LocaleConfig.defaultLocale = "es";

const schema = z.object({
  plan: z.string().min(1, "Requerido"),
  status: z.string().min(1, "Requerido"),
  stripe_subscription_id: z.string().min(1, "Requerido"),
});

type FormValues = z.infer<typeof schema>;

const emptyValues: FormValues = {
  plan: "",
  status: "",
  stripe_subscription_id: "",
};

function valuesFromSubscription(subscription: NonNullable<ReturnType<typeof subscriptionFor>>): FormValues {
  return {
    plan: subscription.plan,
    status: subscription.status,
    stripe_subscription_id: subscription.stripe_subscription_id,
  };
}

function datePart(value: string): string {
  return value.slice(0, 10);
}

function isPeriodEnded(value: string): boolean {
  return datePart(value) < toDateKey(new Date());
}

function formatDate(value: string | null): string {
  if (!value) {
    return "—";
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }
  return date.toLocaleDateString("es-AR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

const calendarTheme = {
  calendarBackground: "#141414",
  backgroundColor: "#141414",
  dayTextColor: "#DDD",
  textDisabledColor: "#333",
  selectedDayBackgroundColor: "#22D3EE",
  selectedDayTextColor: "#000",
  todayTextColor: "#22D3EE",
  monthTextColor: "#FFF",
  arrowColor: "#22D3EE",
  textMonthFontWeight: "800" as const,
  textDayFontSize: 14,
  textMonthFontSize: 16,
  dotColor: "#22D3EE",
  selectedDotColor: "#000",
};

function FilterChipRow({
  label,
  options,
  selected,
  onSelect,
}: {
  label: string;
  options: { label: string; value: string }[];
  selected: string;
  onSelect: (value: string) => void;
}) {
  return (
    <View className="mb-3">
      <Text className="mb-1 text-xs font-bold uppercase tracking-wide text-gray-500">
        {label}
      </Text>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerClassName="gap-2 pr-2"
      >
        {options.map((option) => {
          const active = option.value === selected;
          return (
            <Pressable
              key={option.value}
              className={`rounded-full border px-4 py-2 ${active ? "border-cyan-400/60 bg-cyan-950/40" : "border-border bg-background"}`}
              onPress={() => onSelect(option.value)}
            >
              <Text
                className={`text-xs font-bold ${active ? "text-cyan-300" : "text-gray-400"}`}
              >
                {option.label}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );
}

export function AdminSubscriptionsScreen() {
  const { role, initializing } = useAuthState();
  const queryClient = useQueryClient();
  const [selectedUser, setSelectedUser] = useState<AdminUser | null>(null);
  const [isFormVisible, setIsFormVisible] = useState(false);
  const [mode, setMode] = useState<"create" | "update">("create");
  const [periodEnd, setPeriodEnd] = useState(toDateKey(new Date()));
  const [search, setSearch] = useState("");
  const [presenceFilter, setPresenceFilter] = useState("all");
  const [planFilter, setPlanFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const { control, handleSubmit, reset } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: emptyValues,
  });

  const usersQuery = useQuery({
    queryKey: queryKeys.adminUsers,
    queryFn: fetchAdminUsers,
    enabled: role === "admin",
  });

  const planOptions = useMemo(() => {
    const plans = new Set<string>();
    for (const user of usersQuery.data ?? []) {
      const sub = subscriptionFor(user);
      if (sub?.plan) {
        plans.add(sub.plan);
      }
    }
    return Array.from(plans).sort();
  }, [usersQuery.data]);

  const filteredUsers = useMemo(() => {
    const query = search.trim().toLowerCase();
    const users = usersQuery.data ?? [];
    return users.filter((user) => {
      const matchSearch =
        query === "" ||
        (user.full_name ?? "").toLowerCase().includes(query);

      const sub = subscriptionFor(user);
      const hasSub = sub !== null;
      const matchPresence =
        presenceFilter === "all" ||
        (presenceFilter === "with" ? hasSub : !hasSub);

      const matchPlan =
        planFilter === "all" ||
        (sub?.plan.toLowerCase() ?? "") === planFilter.toLowerCase();

      const status = sub?.status.toLowerCase() ?? "";
      const matchStatus =
        statusFilter === "all" ||
        (statusFilter === "active"
          ? status === "active"
          : hasSub && status !== "active");

      return matchSearch && matchPresence && matchPlan && matchStatus;
    });
  }, [usersQuery.data, search, presenceFilter, planFilter, statusFilter]);

  const subscription = selectedUser ? subscriptionFor(selectedUser) : null;
  const hasEnded = subscription?.current_period_end
    ? isPeriodEnded(subscription.current_period_end)
    : false;

  const applyMode = (nextMode: "create" | "update") => {
    setMode(nextMode);
    if (!selectedUser) {
      return;
    }
    if (nextMode === "update") {
      const sub = subscriptionFor(selectedUser);
      if (sub) {
        reset(valuesFromSubscription(sub));
        setPeriodEnd(
          sub.current_period_end ? datePart(sub.current_period_end) : toDateKey(new Date()),
        );
      }
      return;
    }
    reset(emptyValues);
    setPeriodEnd(toDateKey(new Date()));
  };

  const openUser = (user: AdminUser) => {
    setSelectedUser(user);
    setIsFormVisible(true);
    const sub = subscriptionFor(user);
    const ended = sub?.current_period_end
      ? isPeriodEnded(sub.current_period_end)
      : false;
    if (sub && !ended) {
      setMode("update");
      reset(valuesFromSubscription(sub));
      setPeriodEnd(
        sub.current_period_end ? datePart(sub.current_period_end) : toDateKey(new Date()),
      );
    } else {
      setMode("create");
      reset(emptyValues);
      setPeriodEnd(toDateKey(new Date()));
    }
  };

  const cancelForm = () => {
    setSelectedUser(null);
    setIsFormVisible(false);
    reset(emptyValues);
  };

  const saveMutation = useMutation({
    mutationFn: async (values: FormValues) => {
      if (!selectedUser) {
        throw new Error("No hay un usuario seleccionado.");
      }
      const input: AdminSubscriptionInput = {
        plan: values.plan.trim(),
        status: values.status.trim(),
        stripe_subscription_id: values.stripe_subscription_id.trim(),
        current_period_end: periodEnd ? `${periodEnd}T00:00:00.000Z` : null,
      };
      if (mode === "create") {
        return createUserSubscription(selectedUser.id, input);
      }
      return updateUserSubscription(selectedUser.id, input);
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: queryKeys.adminUsers });
      setSelectedUser(null);
      setIsFormVisible(false);
      reset(emptyValues);
      Alert.alert(
        "Guardado",
        mode === "create" ? "Suscripción creada." : "Suscripción actualizada.",
      );
    },
    onError: (error) => {
      Alert.alert("Error al guardar", (error as Error).message);
    },
  });

  if (initializing || usersQuery.isLoading) {
    return (
      <Screen scroll={false}>
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator color="#22D3EE" />
        </View>
      </Screen>
    );
  }

  if (role !== "admin") {
    return (
      <Screen scroll={false}>
        <View className="flex-1 items-center justify-center px-4">
          <Text className="text-center text-2xl font-bold text-white">
            Acceso admin requerido
          </Text>
          <Text className="mt-2 text-center text-sm text-gray-500">
            Solo admins pueden gestionar suscripciones.
          </Text>
        </View>
      </Screen>
    );
  }

  const markedDates: Record<string, any> = {
    [periodEnd]: {
      selected: true,
      selectedColor: "#22D3EE",
      selectedTextColor: "#000",
    },
  };

  return (
    <Screen>
      <View className="mb-5 mt-4 flex-row items-start justify-between gap-3">
        <View className="flex-1">
          <Text className="text-2xl font-bold text-white">
            Gestionar Suscripciones
          </Text>
          <Text className="mt-1 text-sm text-gray-400">
            Asigna o actualiza el plan y suscripción de cada usuario.
          </Text>
        </View>
      </View>

      {!isFormVisible ? (
        <>
          <TextInput
            className="mb-4 h-12 rounded-xl border border-border bg-surface px-3 text-white"
            value={search}
            onChangeText={setSearch}
            placeholder="Buscar por nombre..."
            placeholderTextColor="#666666"
            autoCapitalize="words"
            autoCorrect={false}
          />

          <FilterChipRow
            label="Suscripción"
            options={[
              { label: "Todos", value: "all" },
              { label: "Con suscripción", value: "with" },
              { label: "Sin suscripción", value: "without" },
            ]}
            selected={presenceFilter}
            onSelect={setPresenceFilter}
          />
          <FilterChipRow
            label="Tipo de suscripción"
            options={[
              { label: "Todos", value: "all" },
              ...planOptions.map((plan) => ({ label: plan, value: plan })),
            ]}
            selected={planFilter}
            onSelect={setPlanFilter}
          />
          <FilterChipRow
            label="Estado"
            options={[
              { label: "Todos", value: "all" },
              { label: "Activo", value: "active" },
              { label: "Inactivo", value: "inactive" },
            ]}
            selected={statusFilter}
            onSelect={setStatusFilter}
          />

          <View className="mb-6 rounded-2xl border border-border bg-surface p-4">
            <Text className="mb-3 text-base font-bold text-white">
              Usuarios ({filteredUsers.length})
            </Text>
            {usersQuery.isError ? (
              <Text className="text-sm text-rose-400">
                No se pudieron cargar los usuarios.
              </Text>
            ) : filteredUsers.length ? (
              filteredUsers.map((user) => {
                const sub = subscriptionFor(user);
                return (
                  <Pressable
                    key={user.id}
                    className="mb-3 rounded-xl border border-border bg-background p-3"
                    onPress={() => openUser(user)}
                  >
                    <View className="flex-row items-start justify-between gap-3">
                      <View className="flex-1">
                        <Text className="font-bold text-white">
                          {user.full_name || user.email || "Usuario"}
                        </Text>
                        <Text className="mt-1 text-xs text-gray-400">
                          {user.email || "Sin email"}
                        </Text>
                        <Text className="mt-2 text-sm text-gray-500">
                          {sub ? `${sub.plan} · ${sub.status}` : "Sin suscripción"}
                        </Text>
                      </View>
                      <View className="items-end gap-1">
                        <Text className="text-[11px] text-gray-500">Hasta</Text>
                        <Text className="text-sm font-semibold text-white">
                          {sub ? formatDate(sub.current_period_end) : "—"}
                        </Text>
                      </View>
                    </View>
                  </Pressable>
                );
              })
            ) : (
              <Text className="text-sm text-gray-400">
                {search ? "Sin resultados para la búsqueda." : "Aún no hay usuarios."}
              </Text>
            )}
          </View>
        </>
      ) : (
        <>
          <View className="mb-4 rounded-2xl border border-border bg-surface p-4">
            <Text className="text-base font-bold text-white">
              {selectedUser?.full_name || selectedUser?.email || "Usuario"}
            </Text>
            <Text className="mt-1 text-xs text-gray-400">
              {selectedUser?.email || ""}
            </Text>
          </View>

          {!subscription ? (
            <View className="mb-4 rounded-xl border border-cyan-400/50 bg-cyan-950/30 p-3">
              <Text className="text-sm text-cyan-300">
                Este usuario no tiene suscripción. Completa el formulario para
                crear una.
              </Text>
            </View>
          ) : null}

          {hasEnded ? (
            <View className="mb-4 rounded-xl border border-amber-400/50 bg-amber-950/30 p-3">
              <Text className="text-sm text-amber-300">
                La suscripción finalizó el{" "}
                {formatDate(subscription?.current_period_end ?? null)}. Puedes
                crear una nueva con otra fecha o actualizar la existente.
              </Text>
              <View className="mt-3 flex-row gap-3">
                <Pressable
                  className={`flex-1 rounded-full border px-3 py-2 ${mode === "create" ? "border-cyan-400/60 bg-cyan-950/40" : "border-border bg-background"}`}
                  onPress={() => applyMode("create")}
                >
                  <Text
                    className={`text-center text-xs font-bold ${mode === "create" ? "text-cyan-300" : "text-gray-400"}`}
                  >
                    Crear Nueva
                  </Text>
                </Pressable>
                <Pressable
                  className={`flex-1 rounded-full border px-3 py-2 ${mode === "update" ? "border-cyan-400/60 bg-cyan-950/40" : "border-border bg-background"}`}
                  onPress={() => applyMode("update")}
                >
                  <Text
                    className={`text-center text-xs font-bold ${mode === "update" ? "text-cyan-300" : "text-gray-400"}`}
                  >
                    Actualizar Existente
                  </Text>
                </Pressable>
              </View>
            </View>
          ) : null}

          <Text className="mb-3 text-lg font-bold text-white">
            {mode === "create" ? "Nueva Suscripción" : "Editar Suscripción"}
          </Text>
          <Input
            control={control}
            name="plan"
            label="Plan"
            placeholder="Ej. premium"
            autoCapitalize="words"
          />
          <Input
            control={control}
            name="status"
            label="Estado"
            placeholder="Ej. active"
          />
          <Input
            control={control}
            name="stripe_subscription_id"
            label="ID Suscripción (Stripe)"
            placeholder="sub_..."
          />

          <Text className="mb-2 text-sm font-medium text-white">
            Fin del Período
          </Text>
          <Calendar
            current={periodEnd}
            onDayPress={(day) => setPeriodEnd(day.dateString)}
            markedDates={markedDates}
            theme={calendarTheme}
            style={{
              borderRadius: 16,
              overflow: "hidden",
              borderWidth: 1,
              borderColor: "#1E1E1E",
              marginBottom: 12,
            }}
          />
          <Text className="mb-3 text-xs text-gray-400">
            Fin del período seleccionado: {periodEnd}
          </Text>

          <Button
            label={mode === "create" ? "Crear Suscripción" : "Guardar Cambios"}
            onPress={handleSubmit((values) => saveMutation.mutate(values))}
            loading={saveMutation.isPending}
          />
          <Button label="Cancelar" variant="secondary" onPress={cancelForm} />
        </>
      )}
    </Screen>
  );
}