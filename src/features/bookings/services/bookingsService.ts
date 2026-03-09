import { httpsCallable } from 'firebase/functions';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { db, functions } from '@/services/firebase/client';
import { auth } from '@/services/firebase/client';
import type { Booking, CallableResponse, GymClass } from '@/types/models';

const bookClassFn = httpsCallable<{ classId: string }, CallableResponse>(functions, 'bookClass');
const cancelBookingFn = httpsCallable<{ classId: string }, CallableResponse>(functions, 'cancelBooking');

export async function bookClass(classId: string) {
  const result = await bookClassFn({ classId });
  return result.data;
}

export async function cancelBooking(classId: string) {
  const result = await cancelBookingFn({ classId });
  return result.data;
}

export async function fetchMyBookingsWithClasses(): Promise<Array<{ booking: Booking; gymClass: GymClass }>> {
  const userId = auth.currentUser?.uid;
  if (!userId) return [];

  const bookingsQuery = query(
    collection(db, 'bookings'),
    where('user_id', '==', userId),
    where('status', '==', 'booked')
  );
  const bookingSnapshot = await getDocs(bookingsQuery);

  const classesMap = new Map<string, GymClass>();
  const classesSnapshot = await getDocs(collection(db, 'classes'));
  classesSnapshot.docs.forEach((doc) => classesMap.set(doc.id, doc.data() as GymClass));

  return bookingSnapshot.docs
    .map((doc) => doc.data() as Booking)
    .map((booking) => ({ booking, gymClass: classesMap.get(booking.class_id)! }))
    .filter((item) => !!item.gymClass);
}

export async function hasUserBookedClass(classId: string): Promise<boolean> {
  const userId = auth.currentUser?.uid;
  if (!userId) return false;

  const q = query(
    collection(db, 'bookings'),
    where('user_id', '==', userId),
    where('class_id', '==', classId),
    where('status', '==', 'booked')
  );

  const snapshot = await getDocs(q);
  return !snapshot.empty;
}
