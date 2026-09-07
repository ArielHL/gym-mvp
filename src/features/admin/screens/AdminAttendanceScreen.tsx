import { useMemo, useState } from "react";
import { ActivityIndicator, Alert, Pressable, View } from "react-native";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Calendar, LocaleConfig } from "react-native-calendars";
import { Screen } from "@/components/ui/Screen";
import { FilterChipRow } from "@/components/ui/FilterChipRow";
import { queryKeys } from "@/constants/queryKeys";
import { useAuthState } from "@/features/auth/hooks/useAuthState";
import { hasAdminAccess } from "@/features/auth/role";
import {
  type AttendanceBooking,
  fetchAttendanceBookings,
  setBookingAttendance,
} from "@/features/admin/services/attendanceService";
import { toDateKey } from "@/utils/date";

import { calendarSelectedMark, calendarTheme, colors } from "@/theme";
import { Text } from "@/components/ui/Text";
type TimeFilter = "all" | "past" | "upcoming";

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

function scheduledAt(booking: AttendanceBooking): Date {
  return new Date(`${booking.date}T${booking.start_time}:00Z`);
}

export function AdminAttendanceScreen() {
  const { role, initializing } = useAuthState();
  const queryClient = useQueryClient();
  const [timeFilter, setTimeFilter] = useState<TimeFilter>("all");
  const [selectedDate, setSelectedDate] = useState(toDateKey(new Date()));
  const [isCalendarVisible, setIsCalendarVisible] = useState(true);

  const bookingsQuery = useQuery({
    queryKey: queryKeys.adminAttendance,
    queryFn: fetchAttendanceBookings,
    enabled: hasAdminAccess(role),
  });

  const filteredBookings = useMemo(() => {
    const bookings = (bookingsQuery.data ?? []).filter(
      (booking) => booking.date === selectedDate,
    );
    if (timeFilter === "all") {
      return bookings;
    }
    const now = Date.now();
    return bookings.filter((booking) =>
      timeFilter === "past"
        ? scheduledAt(booking).getTime() < now
        : scheduledAt(booking).getTime() >= now,
    );
  }, [bookingsQuery.data, selectedDate, timeFilter]);

  const attendedCount = useMemo(
    () => filteredBookings.filter((booking) => booking.attended).length,
    [filteredBookings],
  );

  const markedDates: Record<string, any> = {
    [selectedDate]: calendarSelectedMark(),
  };

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
      <Screen edges={[]} scroll={false}>
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator color={colors.accent.cyan} />
        </View>
      </Screen>
    );
  }

  if (!hasAdminAccess(role)) {
    return (
      <Screen edges={[]} scroll={false}>
        <View className="flex-1 items-center justify-center px-4">
          <Text className="text-center text-2xl font-bold text-white" variant="title">
            Acceso admin requerido
          </Text>
          <Text className="mt-2 text-center text-sm text-muted">
            Solo los administradores pueden gestionar la asistencia.
          </Text>
        </View>
      </Screen>
    );
  }

  return (
    <Screen edges={[]}>
      <View className="mb-5 mt-4">
        <Text className="text-2xl font-bold text-white" variant="title">Asistencia</Text>
        <Text className="mt-1 text-sm text-muted">
          Marca si cada miembro asistió a la clase reservada.
        </Text>
      </View>

      <FilterChipRow
        label="Período"
        options={[
          { label: "Todas", value: "all" },
          { label: "Pasadas", value: "past" },
          { label: "Próximas", value: "upcoming" },
        ]}
        selected={timeFilter}
        onSelect={setTimeFilter}
      />

      <View className="mb-4 rounded-2xl border border-border bg-surface p-4">
        <View className="mb-3 flex-row items-center justify-between gap-3">
          <View className="flex-1">
            <Text className="text-base font-bold text-white">
              Fecha seleccionada
            </Text>
            <Text className="mt-1 text-xs text-muted">
              {isCalendarVisible
                ? "Selecciona el día de la clase para marcar asistencia."
                : "La lista se filtra por esta fecha."}
            </Text>
          </View>
          <View className="items-end gap-2">
            <Text className="text-sm font-semibold text-accent-cyan">
              {selectedDate}
            </Text>
            {!isCalendarVisible ? (
              <Pressable
                className="rounded-full border border-accent-cyan/60 bg-accent-cyan/10 px-3 py-2"
                onPress={() => setIsCalendarVisible(true)}
              >
                <Text className="text-xs font-bold text-accent-cyan">
                  MODIFICAR
                </Text>
              </Pressable>
            ) : null}
          </View>
        </View>
        {isCalendarVisible ? (
          <Calendar
            current={selectedDate}
            onDayPress={(day) => {
              setSelectedDate(day.dateString);
              setIsCalendarVisible(false);
            }}
            markedDates={markedDates}
            theme={calendarTheme}
            style={{
              borderRadius: 16,
              overflow: "hidden",
              borderWidth: 1,
              borderColor: colors.surface.elevated,
            }}
          />
        ) : null}
      </View>

      <View className="mb-6 rounded-2xl border border-border bg-surface p-4">
        <View className="mb-3 flex-row items-center justify-between">
          <Text className="text-base font-bold text-white">
            Reservas ({filteredBookings.length})
          </Text>
          <Text className="text-sm font-semibold text-accent-cyan">
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
                    <Text className="mt-1 text-sm text-muted">
                      {booking.title}
                    </Text>
                    <Text className="mt-1 text-xs text-muted">
                      {booking.date} · {booking.start_time} - {booking.end_time}
                    </Text>
                    <Text className="mt-1 text-xs text-accent-cyan">
                      {booking.location}
                    </Text>
                  </View>
                  <Pressable
                    className={`rounded-full border px-3 py-2 ${
                      booking.attended
                        ? "border-accent-cyan/60 bg-accent-cyan/10"
                        : "border-border bg-surface"
                    }`}
                    disabled={attendanceMutation.isPending}
                    onPress={() => toggleAttendance(booking)}
                  >
                    <Text
                      className={`text-xs font-bold ${
                        booking.attended ? "text-accent-cyan" : "text-muted"
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
          <Text className="text-sm text-muted">
            {timeFilter === "all"
              ? `No hay reservas para el ${selectedDate}.`
              : timeFilter === "past"
                ? `No hay clases pasadas para el ${selectedDate}.`
                : `No hay clases próximas para el ${selectedDate}.`}
          </Text>
        )}
      </View>
    </Screen>
  );
}
