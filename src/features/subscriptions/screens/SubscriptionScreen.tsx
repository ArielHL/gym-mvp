import { useEffect, useState } from "react";
import {
  ActivityIndicator, Alert, Pressable, ScrollView, StatusBar, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { fetchMySubscriptions, type Subscription } from "@/features/subscriptions/services/subscriptionService";

import { colors } from "@/theme";
import { Text } from "@/components/ui/Text";
function formatDate(value: string | null): string {
  if (!value) {
    return "—";
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }
  return date.toLocaleDateString("es-AR", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

export function SubscriptionScreen() {
  const router = useRouter();

  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    fetchMySubscriptions()
      .then((subscriptions) => {
        if (mounted) {
          setSubscription(subscriptions[0] ?? null);
        }
      })
      .catch((err) => {
        if (mounted) {
          Alert.alert("Error", (err as Error).message);
        }
      })
      .finally(() => {
        if (mounted) {
          setLoading(false);
        }
      });

    return () => {
      mounted = false;
    };
  }, []);

  const onCancel = () => {
    router.back();
  };

  return (
    <SafeAreaView className="flex-1 bg-background">
      <StatusBar barStyle="light-content" backgroundColor={colors.background} />
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerClassName="px-7 py-6"
      >
        <View className="mb-6 flex-row items-center justify-between">
          <Pressable onPress={onCancel} className="px-2 py-2" hitSlop={8}>
            <Text className="text-base font-bold text-accent-cyan">
              Cancelar
            </Text>
          </Pressable>
          <Text className="text-lg font-black text-white" variant="title">Mi Suscripción</Text>
          <View className="w-20" />
        </View>

        {loading ? (
          <View className="py-20 items-center">
            <ActivityIndicator color={colors.accent.cyan} />
          </View>
        ) : !subscription ? (
          <View className="items-center rounded-3xl border border-border bg-surface p-8">
            <Text className="text-4xl">💳</Text>
            <Text className="mt-3 text-center text-base font-bold text-white">
              No tienes una suscripción activa
            </Text>
            <Text className="mt-1 text-center text-sm text-muted">
              Contacta al administrador para gestionar tu plan.
            </Text>
            <Pressable
              className="mt-4 rounded-xl bg-accent-cyan px-4 py-3"
              onPress={() => router.push("/subscribe" as never)}
            >
              <Text className="text-center text-sm font-bold text-black">
                Contactar por WhatsApp
              </Text>
            </Pressable>
          </View>
        ) : (
          <View className="gap-4 rounded-3xl border border-border bg-surface p-5">
            <View>
              <Text className="mb-1 text-sm font-semibold text-muted">
                Plan
              </Text>
              <Text className="text-base text-white">{subscription.plan}</Text>
            </View>
            <View>
              <Text className="mb-1 text-sm font-semibold text-muted">
                Estado
              </Text>
              <Text className="text-base text-white">{subscription.status}</Text>
            </View>
            <View>
              <Text className="mb-1 text-sm font-semibold text-muted">
                ID de Suscripción (Stripe)
              </Text>
              <Text className="text-base text-white">
                {subscription.stripe_subscription_id || "—"}
              </Text>
            </View>
            <View>
              <Text className="mb-1 text-sm font-semibold text-muted">
                Fin del Período Actual
              </Text>
              <Text className="text-base text-white">
                {formatDate(subscription.current_period_end)}
              </Text>
            </View>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}