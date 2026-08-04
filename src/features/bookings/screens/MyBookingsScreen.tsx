import {
  View,
  Text,
  FlatList,
  Pressable,
  ActivityIndicator,
  Alert,
  StyleSheet,
  StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useCancelBooking, useMyBookings } from '@/features/bookings/hooks/useBookings';
import { authService } from '@/features/auth/services/authService';
import { prettyDateTime } from '@/utils/date';

export function MyBookingsScreen() {
  const { data, isLoading, isError } = useMyBookings();
  const cancelMutation = useCancelBooking();

  const onLogout = () => {
    Alert.alert('Log out', 'Are you sure you want to log out?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Log out',
        style: 'destructive',
        onPress: async () => {
          try {
            await authService.logout();
            // Auth state change drives navigation back to Landing automatically
          } catch (err) {
            Alert.alert('Error', (err as Error).message);
          }
        },
      },
    ]);
  };

  const onCancelBooking = (classId: string) => {
    Alert.alert('Cancel booking', 'Remove this class from your bookings?', [
      { text: 'Keep it', style: 'cancel' },
      {
        text: 'Cancel booking',
        style: 'destructive',
        onPress: async () => {
          try {
            const result = await cancelMutation.mutateAsync(classId);
            Alert.alert('Cancelled', result.message);
          } catch (err) {
            Alert.alert('Error', (err as Error).message);
          }
        },
      },
    ]);
  };

  return (
    <SafeAreaView style={styles.root}>
      <StatusBar barStyle="light-content" backgroundColor="#000000" />

      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.heading}>My Bookings</Text>
        <Pressable
          style={({ pressed }) => [styles.logoutBtn, pressed && { opacity: 0.6 }]}
          onPress={onLogout}
        >
          <Text style={styles.logoutText}>Log out</Text>
        </Pressable>
      </View>

      <View style={styles.divider} />

      {isLoading && (
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#22D3EE" />
        </View>
      )}

      {isError && (
        <View style={styles.center}>
          <Text style={styles.errorText}>Could not load bookings.</Text>
        </View>
      )}

      {!isLoading && !isError && (
        <FlatList
          data={data ?? []}
          keyExtractor={(item) => item.booking.id}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={styles.center}>
              <Text style={styles.emptyText}>No booked classes yet.</Text>
              <Text style={styles.emptyHint}>Go to Classes and book one!</Text>
            </View>
          }
          renderItem={({ item }) => (
            <View style={styles.card}>
              <Text style={styles.cardTitle}>{item.gymClass.title}</Text>
              <Text style={styles.cardTrainer}>{item.gymClass.trainer_name}</Text>
              <Text style={styles.cardTime}>
                {prettyDateTime(item.gymClass.date, item.gymClass.start_time, item.gymClass.end_time)}
              </Text>
              <View style={styles.cardFooter}>
                <View style={styles.statusBadge}>
                  <Text style={styles.statusText}>BOOKED</Text>
                </View>
                <Pressable
                  style={({ pressed }) => [
                    styles.cancelBtn,
                    (pressed || cancelMutation.isPending) && { opacity: 0.65 },
                  ]}
                  onPress={() => onCancelBooking(item.gymClass.id)}
                  disabled={cancelMutation.isPending}
                >
                  <Text style={styles.cancelBtnText}>Cancel</Text>
                </Pressable>
              </View>
            </View>
          )}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#000000' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 8,
  },
  heading: { fontSize: 30, fontWeight: '900', color: '#ffffff' },
  logoutBtn: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#333333',
  },
  logoutText: { color: '#f87171', fontSize: 13, fontWeight: '600' },
  divider: { height: 1, backgroundColor: '#1c1c1c', marginHorizontal: 16 },
  list: { paddingHorizontal: 16, paddingTop: 12, paddingBottom: 32 },
  card: {
    backgroundColor: '#111111',
    borderRadius: 14,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#222222',
  },
  cardTitle: { fontSize: 17, fontWeight: '700', color: '#ffffff' },
  cardTrainer: { fontSize: 13, color: '#777777', marginTop: 4 },
  cardTime: { fontSize: 13, color: '#555555', marginTop: 4 },
  cardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 10,
  },
  statusBadge: {
    alignSelf: 'flex-start',
    backgroundColor: '#052e16',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  statusText: { fontSize: 10, fontWeight: '700', color: '#34d399', letterSpacing: 1 },
  cancelBtn: {
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#EF444455',
    backgroundColor: '#EF444411',
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  cancelBtnText: { color: '#f87171', fontSize: 12, fontWeight: '700' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 60 },
  errorText: { color: '#f87171', fontSize: 15 },
  emptyText: { color: '#555555', fontSize: 15, fontWeight: '600' },
  emptyHint: { color: '#333333', fontSize: 13, marginTop: 6 },
});
