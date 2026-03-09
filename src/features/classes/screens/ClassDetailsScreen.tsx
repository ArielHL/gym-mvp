import { Alert, Text, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '@/types/navigation';
import { Screen } from '@/components/ui/Screen';
import { Button } from '@/components/ui/Button';
import { prettyDateTime } from '@/utils/date';
import { useBookClass, useBookedStatus, useCancelBooking } from '@/features/bookings/hooks/useBookings';

type Props = NativeStackScreenProps<RootStackParamList, 'ClassDetails'>;

export function ClassDetailsScreen({ route }: Props) {
  const { gymClass } = route.params;
  const bookMutation = useBookClass();
  const cancelMutation = useCancelBooking();
  const { data: isBooked } = useBookedStatus(gymClass.id);
  const isFull = gymClass.available_spots <= 0;

  const onBook = async () => {
    try {
      const result = await bookMutation.mutateAsync(gymClass.id);
      Alert.alert('Booking', result.message);
    } catch (error) {
      Alert.alert('Booking failed', String((error as Error).message));
    }
  };

  const onCancel = async () => {
    try {
      const result = await cancelMutation.mutateAsync(gymClass.id);
      Alert.alert('Cancellation', result.message);
    } catch (error) {
      Alert.alert('Cancellation failed', String((error as Error).message));
    }
  };

  return (
    <Screen>
      <Text className="mt-4 text-3xl font-bold text-white">{gymClass.title}</Text>
      <Text className="mt-2 text-slate-300">{gymClass.description}</Text>

      <View className="mt-6 rounded-xl bg-slate-900 p-4">
        <Text className="text-slate-200">Trainer: {gymClass.trainer_name}</Text>
        <Text className="mt-1 text-slate-200">Type: {gymClass.exercise_type}</Text>
        <Text className="mt-1 text-slate-200">Duration: {gymClass.duration_minutes} mins</Text>
        <Text className="mt-1 text-slate-200">{prettyDateTime(gymClass.date, gymClass.start_time, gymClass.end_time)}</Text>
        <Text className="mt-1 text-slate-200">Difficulty: {gymClass.difficulty_level}</Text>
        <Text className="mt-1 text-slate-200">Location: {gymClass.location}</Text>
        <Text className="mt-1 text-slate-200">Remaining spots: {gymClass.available_spots}</Text>
      </View>

      {isBooked ? (
        <>
          <Text className="mt-4 text-emerald-400">Already booked</Text>
          <Button label="Cancel Booking" onPress={onCancel} variant="danger" loading={cancelMutation.isPending} />
        </>
      ) : (
        <Button
          label={isFull ? 'Class Full' : 'Book Class'}
          onPress={onBook}
          disabled={isFull}
          loading={bookMutation.isPending}
        />
      )}
    </Screen>
  );
}
