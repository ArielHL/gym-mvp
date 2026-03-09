import { useMemo, useState } from 'react';
import { Text } from 'react-native';
import { Calendar, type DateData } from 'react-native-calendars';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Screen } from '@/components/ui/Screen';
import { useClasses } from '@/features/classes/hooks/useClasses';
import { toDateKey } from '@/utils/date';
import { ClassCard } from '@/features/classes/components/ClassCard';
import { EmptyView, ErrorView, LoadingView } from '@/components/feedback/StateViews';
import type { RootStackParamList } from '@/types/navigation';

export function ClassesScreen() {
  const today = useMemo(() => toDateKey(new Date()), []);
  const [selectedDate, setSelectedDate] = useState(today);
  const { data, isLoading, isError } = useClasses(selectedDate);
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();

  return (
    <Screen>
      <Text className="mb-4 mt-4 text-2xl font-bold text-white">Classes Calendar</Text>
      <Calendar
        onDayPress={(day: DateData) => setSelectedDate(day.dateString)}
        markedDates={{ [selectedDate]: { selected: true } }}
        theme={{
          calendarBackground: '#0F172A',
          dayTextColor: '#E2E8F0',
          monthTextColor: '#E2E8F0',
          textDisabledColor: '#475569',
          selectedDayBackgroundColor: '#0E7490'
        }}
      />

      {isLoading && <LoadingView label="Loading classes..." />}
      {isError && <ErrorView message="Could not load classes." />}
      {!isLoading && !isError && data?.length === 0 && <EmptyView message="No classes for this day." />}
      {data?.map((gymClass) => (
        <ClassCard
          key={gymClass.id}
          gymClass={gymClass}
          onPress={() => navigation.navigate('ClassDetails', { gymClass })}
        />
      ))}
    </Screen>
  );
}
