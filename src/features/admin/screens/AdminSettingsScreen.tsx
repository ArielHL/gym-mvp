import { useEffect } from "react";
import { Alert, ActivityIndicator, Text, View } from "react-native";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Screen } from "@/components/ui/Screen";
import { queryKeys } from "@/constants/queryKeys";
import { useAuthState } from "@/features/auth/hooks/useAuthState";
import {
  DEFAULT_WEEKS_AHEAD_TO_GENERATE,
  MAX_WEEKS_AHEAD_TO_GENERATE,
  MIN_WEEKS_AHEAD_TO_GENERATE,
  fetchWeeksAheadToGenerate,
  updateWeeksAheadToGenerate,
} from "@/features/admin/services/adminSettingsService";

const schema = z.object({
  weeksAhead: z.coerce
    .number()
    .int()
    .min(MIN_WEEKS_AHEAD_TO_GENERATE)
    .max(MAX_WEEKS_AHEAD_TO_GENERATE),
});

type FormValues = z.infer<typeof schema>;

export function AdminSettingsScreen() {
  const { role, initializing } = useAuthState();
  const queryClient = useQueryClient();
  const { control, handleSubmit, reset } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { weeksAhead: DEFAULT_WEEKS_AHEAD_TO_GENERATE },
  });

  const settingsQuery = useQuery({
    queryKey: queryKeys.adminSettings,
    queryFn: fetchWeeksAheadToGenerate,
    enabled: role === "admin",
  });

  useEffect(() => {
    if (settingsQuery.data) {
      reset({ weeksAhead: settingsQuery.data });
    }
  }, [reset, settingsQuery.data]);

  const mutation = useMutation({
    mutationFn: (values: FormValues) =>
      updateWeeksAheadToGenerate(values.weeksAhead),
    onSuccess: async (weeks) => {
      reset({ weeksAhead: weeks });
      await queryClient.invalidateQueries({
        queryKey: queryKeys.adminSettings,
      });
      Alert.alert("Saved", `New classes will generate ${weeks} weeks ahead.`);
    },
    onError: (error) => {
      Alert.alert("Save failed", (error as Error).message);
    },
  });

  if (initializing || settingsQuery.isLoading) {
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
            Admin access required
          </Text>
          <Text className="mt-2 text-center text-sm text-gray-500">
            Only admins can manage class settings.
          </Text>
        </View>
      </Screen>
    );
  }

  return (
    <Screen>
      <Text className="mb-2 mt-4 text-2xl font-bold text-white">
        Class Settings
      </Text>
      <Text className="mb-6 text-sm leading-5 text-gray-400">
        Configure how many weeks of future class sessions are created whenever
        an admin creates or updates a class template.
      </Text>
      <Input
        control={control}
        name="weeksAhead"
        label="Weeks ahead to generate"
        placeholder="3"
      />
      <Text className="text-xs text-gray-500">
        Allowed range: {MIN_WEEKS_AHEAD_TO_GENERATE} to{" "}
        {MAX_WEEKS_AHEAD_TO_GENERATE} weeks.
      </Text>
      <Button
        label="Save Settings"
        onPress={handleSubmit((values) => mutation.mutate(values))}
        loading={mutation.isPending}
      />
    </Screen>
  );
}
