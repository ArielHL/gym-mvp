import {
  View,
  Text,
  ScrollView,
  Pressable,
  ActivityIndicator,
  Alert,
  StyleSheet,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import {
  useBookedStatus,
  useCancelBooking,
} from '@/features/bookings/hooks/useBookings';
import { useAuthState } from '@/features/auth/hooks/useAuthState';
import { useClass } from '@/features/classes/hooks/useClasses';
import { prettyDateTime } from '@/utils/date';

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
  const { data: gymClass, isLoading, isError } = useClass(classId);
  const { user } = useAuthState();
  const cancelMutation = useCancelBooking();
  const { data: isBooked, isLoading: checkingBooking } = useBookedStatus(
    classId ?? '',
    Boolean(user && classId),
  );
  const isFull = (gymClass?.available_spots ?? 0) <= 0;

  if (isLoading) {
    return (
      <SafeAreaView style={styles.root} edges={['top', 'bottom']}>
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#22D3EE" />
          <Text style={styles.mutedText}>Loading class...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (isError || !gymClass) {
    return (
      <SafeAreaView style={styles.root} edges={['top', 'bottom']}>
        <View style={styles.center}>
          <Text style={styles.errorText}>Could not load this class</Text>
        </View>
      </SafeAreaView>
    );
  }

  const onBook = () => {
    router.push({
      pathname: '/bookings/new',
      params: {
        classId: gymClass.id,
        className: gymClass.title,
        classDate: gymClass.date,
      },
    });
  };

  const onCancel = async () => {
    Alert.alert('Cancel booking', 'Remove this class from your bookings?', [
      { text: 'Keep it', style: 'cancel' },
      {
        text: 'Cancel booking',
        style: 'destructive',
        onPress: async () => {
          try {
            const result = await cancelMutation.mutateAsync(gymClass.id);
            Alert.alert('Cancelled', result.message);
          } catch (err) {
            Alert.alert('Error', (err as Error).message);
          }
        },
      },
    ]);
  };

  return (
    <SafeAreaView style={styles.root} edges={['top', 'bottom']}>
      <View style={styles.header}>
        <Pressable style={styles.backBtn} onPress={() => router.back()}>
          <Text style={styles.backIcon}>‹</Text>
        </Pressable>
        <Text style={styles.headerTitle}>Class Details</Text>
      </View>
      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.title}>{gymClass.title}</Text>
        <Text style={styles.desc}>{gymClass.description}</Text>

        <View style={styles.infoCard}>
          <InfoRow label="Trainer" value={gymClass.trainer_name} />
          <InfoRow label="Type" value={gymClass.exercise_type} />
          <InfoRow
            label="Duration"
            value={`${gymClass.duration_minutes} min`}
          />
          <InfoRow
            label="When"
            value={prettyDateTime(
              gymClass.date,
              gymClass.start_time,
              gymClass.end_time,
            )}
          />
          <InfoRow label="Difficulty" value={gymClass.difficulty_level} />
          <InfoRow label="Location" value={gymClass.location} />
          <InfoRow
            label="Spots left"
            value={String(gymClass.available_spots)}
          />
        </View>

        {checkingBooking ? (
          <ActivityIndicator style={styles.checkLoader} color="#22D3EE" />
        ) : isBooked ? (
          <View style={[styles.btnShell, styles.btnDangerShell]}>
            <Pressable
              style={({ pressed }) => [
                styles.btnPressable,
                (pressed || cancelMutation.isPending) && styles.btnDisabled,
              ]}
              onPress={onCancel}
              disabled={cancelMutation.isPending}
            >
              {cancelMutation.isPending ? (
                <ActivityIndicator color="#ffffff" />
              ) : (
                <Text style={styles.btnTextDanger}>Cancel Booking</Text>
              )}
            </Pressable>
          </View>
        ) : (
          <View style={styles.btnShell}>
            <Pressable
              style={({ pressed }) => [
                styles.btnPressable,
                (isFull || pressed) && styles.btnDisabled,
              ]}
              onPress={onBook}
              disabled={isFull}
            >
              <Text style={styles.btnText}>
                {isFull ? 'Class Full' : 'Book Class'}
              </Text>
            </Pressable>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#000000' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 8,
  },
  backBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#111111',
    borderWidth: 1,
    borderColor: '#222222',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  backIcon: { color: '#22D3EE', fontSize: 28, lineHeight: 30 },
  headerTitle: { color: '#ffffff', fontSize: 16, fontWeight: '800' },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    padding: 20,
  },
  mutedText: { color: '#666666', fontSize: 14 },
  errorText: { color: '#ef4444', fontSize: 15, fontWeight: '700' },
  scroll: { paddingHorizontal: 20, paddingTop: 12, paddingBottom: 48 },
  title: { fontSize: 28, fontWeight: '900', color: '#ffffff', lineHeight: 34 },
  desc: { fontSize: 15, color: '#666666', marginTop: 8, lineHeight: 22 },
  infoCard: {
    backgroundColor: '#111111',
    borderRadius: 14,
    padding: 16,
    marginTop: 20,
    borderWidth: 1,
    borderColor: '#222222',
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#1a1a1a',
  },
  rowLabel: { fontSize: 14, color: '#555555' },
  rowValue: {
    fontSize: 14,
    color: '#ffffff',
    fontWeight: '600',
    flex: 1,
    textAlign: 'right',
    marginLeft: 12,
  },
  checkLoader: { marginTop: 24 },
  btnShell: {
    marginTop: 48,
    height: 54,
    backgroundColor: '#add8e6',
    borderRadius: 12,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnPressable: {
    // flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnDangerShell: {
    backgroundColor: '#1a1a1a',
    borderWidth: 1,
    borderColor: '#ef4444',
  },
  btnDisabled: { opacity: 0.45 },
  btnText: { fontSize: 16, fontWeight: '700', color: '#000000' },
  btnTextDanger: { fontSize: 16, fontWeight: '700', color: '#ef4444' },
});
