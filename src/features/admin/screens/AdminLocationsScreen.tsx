import { useEffect, useState } from "react";
import { ActivityIndicator, Alert, Pressable, Text, View } from "react-native";
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
  type Location,
  createLocation,
  fetchLocations,
  setLocationActive,
  updateLocation,
} from "@/features/locations/services/locationsService";

const schema = z.object({
  name: z.string().min(2),
  description: z.string().optional(),
  address: z.string().optional(),
});

type FormValues = z.infer<typeof schema>;

const emptyValues: FormValues = {
  name: "",
  description: "",
  address: "",
};

function valuesFromLocation(location: Location): FormValues {
  return {
    name: location.name,
    description: location.description ?? "",
    address: location.address ?? "",
  };
}

export function AdminLocationsScreen() {
  const { role, initializing } = useAuthState();
  const queryClient = useQueryClient();
  const [selectedLocation, setSelectedLocation] = useState<Location | null>(
    null,
  );
  const [isFormVisible, setIsFormVisible] = useState(false);
  const { control, handleSubmit, reset } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: emptyValues,
  });

  const locationsQuery = useQuery({
    queryKey: queryKeys.locations,
    queryFn: fetchLocations,
    enabled: role === "admin",
  });

  useEffect(() => {
    if (selectedLocation) {
      reset(valuesFromLocation(selectedLocation));
    }
  }, [reset, selectedLocation]);

  const invalidateLocations = async () => {
    await queryClient.invalidateQueries({ queryKey: queryKeys.locations });
  };

  const saveMutation = useMutation({
    mutationFn: async (values: FormValues) => {
      const payload = {
        ...values,
        is_active: selectedLocation?.is_active ?? true,
      };

      if (selectedLocation) {
        return updateLocation(selectedLocation.id, payload);
      }

      return createLocation(payload);
    },
    onSuccess: async () => {
      await invalidateLocations();
      setSelectedLocation(null);
      setIsFormVisible(false);
      reset(emptyValues);
      Alert.alert("Saved", "Location saved.");
    },
    onError: (error) => {
      Alert.alert("Save failed", (error as Error).message);
    },
  });

  const activeMutation = useMutation({
    mutationFn: async ({
      location,
      isActive,
    }: {
      location: Location;
      isActive: boolean;
    }) => {
      await setLocationActive(location.id, isActive);
    },
    onSuccess: async (_, variables) => {
      await invalidateLocations();
      setSelectedLocation((current) =>
        current ? { ...current, is_active: variables.isActive } : current,
      );
      Alert.alert(
        variables.isActive ? "Reactivated" : "Deactivated",
        "Location status updated.",
      );
    },
    onError: (error) => {
      Alert.alert("Update failed", (error as Error).message);
    },
  });

  const startNewLocation = () => {
    setSelectedLocation(null);
    reset(emptyValues);
    setIsFormVisible(true);
  };

  const cancelForm = () => {
    setSelectedLocation(null);
    reset(emptyValues);
    setIsFormVisible(false);
  };

  const confirmToggleActive = (location: Location) => {
    const nextIsActive = !location.is_active;

    if (nextIsActive) {
      activeMutation.mutate({ location, isActive: true });
      return;
    }

    Alert.alert(
      "Deactivate location",
      "This keeps the location record but marks it inactive for admin management.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Deactivate",
          style: "destructive",
          onPress: () => activeMutation.mutate({ location, isActive: false }),
        },
      ],
    );
  };

  if (initializing || locationsQuery.isLoading) {
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
            Only admins can manage locations.
          </Text>
        </View>
      </Screen>
    );
  }

  return (
    <Screen>
      <View className="mb-5 mt-4 flex-row items-start justify-between gap-3">
        <View className="flex-1">
          <Text className="text-2xl font-bold text-white">
            Manage Locations
          </Text>
          <Text className="mt-1 text-sm text-gray-400">
            Add locations, update gym area details, and deactivate unused rooms.
          </Text>
        </View>
        {!isFormVisible ? (
          <Pressable
            className="rounded-xl border border-border bg-surface px-4 py-3"
            onPress={startNewLocation}
          >
            <Text className="font-semibold text-white">New</Text>
          </Pressable>
        ) : null}
      </View>

      {!isFormVisible ? (
        <View className="mb-6 rounded-2xl border border-border bg-surface p-4">
          <Text className="mb-3 text-base font-bold text-white">Locations</Text>
          {locationsQuery.isError ? (
            <Text className="text-sm text-rose-400">
              Could not load locations.
            </Text>
          ) : locationsQuery.data?.length ? (
            locationsQuery.data.map((location) => {
              const selected = selectedLocation?.id === location.id;
              return (
                <Pressable
                  key={location.id}
                  className={`mb-3 rounded-xl border p-3 ${selected ? "border-accent-cyan bg-cyan-950/30" : "border-border bg-background"}`}
                  onPress={() => {
                    setSelectedLocation(location);
                    setIsFormVisible(true);
                  }}
                >
                  <View className="flex-row items-start justify-between gap-3">
                    <View className="flex-1">
                      <Text className="font-bold text-white">
                        {location.name}
                      </Text>
                      <Text className="mt-1 text-xs text-gray-400">
                        {location.address || "No address provided"}
                      </Text>
                      {location.description ? (
                        <Text className="mt-2 text-sm text-gray-500">
                          {location.description}
                        </Text>
                      ) : null}
                    </View>
                    <Pressable
                      className={`rounded-full border px-3 py-2 ${location.is_active ? "border-cyan-400/60 bg-cyan-950/40" : "border-amber-400/60 bg-amber-950/30"}`}
                      disabled={activeMutation.isPending}
                      onPress={(event) => {
                        event.stopPropagation();
                        confirmToggleActive(location);
                      }}
                    >
                      <Text
                        className={`text-xs font-bold ${location.is_active ? "text-cyan-300" : "text-amber-300"}`}
                      >
                        {location.is_active ? "ACTIVE" : "INACTIVE"}
                      </Text>
                    </Pressable>
                  </View>
                </Pressable>
              );
            })
          ) : (
            <Text className="text-sm text-gray-400">No locations yet.</Text>
          )}
        </View>
      ) : (
        <>
          <Text className="mb-3 text-lg font-bold text-white">
            {selectedLocation ? "Edit Location" : "Create Location"}
          </Text>
          <Input
            control={control}
            name="name"
            label="Name"
            placeholder="Main Studio"
            autoCapitalize="words"
          />
          <Input
            control={control}
            name="description"
            label="Description"
            placeholder="Strength and conditioning room"
            autoCapitalize="sentences"
          />
          <Input
            control={control}
            name="address"
            label="Address"
            placeholder="123 Fitness Ave"
            autoCapitalize="words"
          />
          <Button
            label={selectedLocation ? "Save Changes" : "Create Location"}
            onPress={handleSubmit((values) => saveMutation.mutate(values))}
            loading={saveMutation.isPending}
          />
          <Button label="Cancel" variant="secondary" onPress={cancelForm} />
        </>
      )}
    </Screen>
  );
}
