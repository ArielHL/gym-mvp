import { useMemo, useState } from "react";
import { ActivityIndicator, Alert, Pressable, Text, View } from "react-native";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Screen } from "@/components/ui/Screen";
import { FilterChipRow } from "@/components/ui/FilterChipRow";
import { queryKeys } from "@/constants/queryKeys";
import { useAuthState } from "@/features/auth/hooks/useAuthState";
import {
  type AttendanceBooking,
  fetchAttendanceBookings,
  setBookingAttendance,
} from "@/features/admin/services/attendanceService";

type TimeFilter = "all" | "past" | "upcoming";

function scheduledAt(booking: AttendanceBooking): Date {
  return new Date(`${booking.date}T${booking.start_time}:00Z`);
}

export function AdminAttendanceScreen() {
  const { role, initializing } = useAuthState();
  const queryClient = useQueryClient();
  const [timeFilter, setTimeFilter] = useState<TimeFilter>("past");

  const bookingsQuery = useQuery({
    queryKey: queryKeys.adminAttendance,
    queryFn: fetchAttendanceBookings,
    enabled: role === "admin",
  });

  const filteredBookings = useMemo(() => {
    const bookings = bookingsQuery.data ?? [];
    if (timeFilter === "all") {
      return bookings;
    }
    const now = Date.now();
    return bookings.filter((booking) =>
      timeFilter === "past"
        ? scheduledAt(booking).getTime() < now
        : scheduledAt(booking).getTime() >= now,
    );
  }, [bookingsQuery.data, timeFilter]);

  const attendedCount = useMemo(
    () => filteredBookings.filter((booking) => booking.attended).length,
    [filteredBookings],
  );

  const attendanceMutation = useMutation({
    mutationFn: ({
      bookingId,
      attended,
    }: {
      bookingId: string;
      attended: boolean;
    }) => setBookingAttendance(bookingId, attended),
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: queryKeys.adminAttendance,
      });
      await queryClient.invalidateQueries({ queryKey: queryKeys.adminUsers });
    },
    onError: (error) => {
      Alert.alert("Error al guardar", (error as Error).message);
    },
  });

  const toggleAttendance = (booking: AttendanceBooking) => {
    attendanceMutation.mutate({
      bookingId: booking.booking_id,
      attended: !booking.attended,
    });
  };

  if (initializing || bookingsQuery.isLoading) {
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
            Solo los administradores pueden gestionar la asistencia.
          </Text>
        </View>
      </Screen>
    );
  }

  return (
    <Screen>
      <View className="mb-5 mt-4">
        <Text className="text-2xl font-bold text-white">Asistencia</Text>
        <Text className="mt-1 text-sm text-gray-400">
          Marca si cada miembro asistió a la clase reservada.
        </Text>
      </View>

      <FilterChipRow
        label="Período"
        options={[
          { label: "Pasadas", value: "past" },
          { label: "Próximas", value: "upcoming" },
          { label: "Todas", value: "all" },
        ]}
        selected={timeFilter}
        onSelect={setTimeFilter}
      />

      <View className="mb-6 rounded-2xl border border-border bg-surface p-4">
        <View className="mb-3 flex-row items-center justify-between">
          <Text className="text-base font-bold text-white">
            Reservas ({filteredBookings.length})
          </Text>
          <Text className="text-sm font-semibold text-cyan-300">
            {attendedCount} asistieron
          </Text>
        </View>

        {bookingsQuery.isError ? (
          <Text className="text-sm text-rose-400">
            No se pudieron cargar las reservas.
          </Text>
        ) : filteredBookings.length ? (
          filteredBookings.map((booking) => {
            const name = booking.full_name || booking.email || "Usuario";
            return (
              <View
                key={booking.booking_id}
                className="mb-3 rounded-xl border border-border bg-background p-3"
              >
                <View className="flex-row items-start justify-between gap-3">
                  <View className="flex-1">
                    <Text className="font-bold text-white">{name}</Text>
                    <Text className="mt-1 text-sm text-gray-300">
                      {booking.title}
                    </Text>
                    <Text className="mt-1 text-xs text-gray-400">
                      {booking.date} · {booking.start_time} - {booking.end_time}
                    </Text>
                    <Text className="mt-1 text-xs text-cyan-300">
                      {booking.location}
                    </Text>
                  </View>
                  <Pressable
                    className={`rounded-full border px-3 py-2 ${
                      booking.attended
                        ? "border-cyan-400/60 bg-cyan-950/40"
                        : "border-border bg-surface"
                    }`}
                    disabled={attendanceMutation.isPending}
                    onPress={() => toggleAttendance(booking)}
                  >
                    <Text
                      className={`text-xs font-bold ${
                        booking.attended ? "text-cyan-300" : "text-gray-400"
                      }`}
                    >
                      {booking.attended ? "ASISTIÓ" : "NO ASISTIÓ"}
                    </Text>
                  </Pressable>
                </View>
              </View>
            );
          })
        ) : (
          <Text className="text-sm text-gray-400">
            {timeFilter === "all"
              ? "Aún no hay reservas."
              : timeFilter === "past"
                ? "No hay clases pasadas."
                : "No hay clases próximas."}
          </Text>
        )}
      </View>
    </Screen>
  );
}