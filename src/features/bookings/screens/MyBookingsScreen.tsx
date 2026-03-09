import { Text, View } from 'react-native';
import { Screen } from '@/components/ui/Screen';
import { useMyBookings } from '@/features/bookings/hooks/useBookings';
import { EmptyView, ErrorView, LoadingView } from '@/components/feedback/StateViews';
import { prettyDateTime } from '@/utils/date';

export function MyBookingsScreen() {
  const { data, isLoading, isError } = useMyBookings();

  return (
    <Screen>
      <Text className="mb-4 mt-4 text-2xl font-bold text-white">My Bookings</Text>
      {isLoading && <LoadingView label="Loading bookings..." />}
      {isError && <ErrorView message="Could not load bookings." />}
      {!isLoading && !isError && data?.length === 0 && <EmptyView message="No booked classes yet." />}

      {data?.map((item) => (
        <View key={item.booking.id} className="mb-3 rounded-xl bg-slate-900 p-4">
          <Text className="text-lg font-semibold text-white">{item.gymClass.title}</Text>
          <Text className="mt-1 text-slate-300">{item.gymClass.trainer_name}</Text>
          <Text className="mt-1 text-slate-300">
            {prettyDateTime(item.gymClass.date, item.gymClass.start_time, item.gymClass.end_time)}
          </Text>
        </View>
      ))}
    </Screen>
  );
}
