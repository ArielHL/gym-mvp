import * as admin from 'firebase-admin';
import * as functionsV1 from 'firebase-functions';
import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { onSchedule } from 'firebase-functions/v2/scheduler';
import { z } from 'zod';

admin.initializeApp();
const db = admin.firestore();

const classPayloadSchema = z.object({ classId: z.string().min(1) });

type CallableResponse<T = unknown> = {
  success: boolean;
  message: string;
  data?: T;
};

export const createUserProfileOnFirstLogin = functionsV1.auth.user().onCreate(async (user) => {
  if (!user) return;

  const userRef = db.collection('users').doc(user.uid);
  const snapshot = await userRef.get();
  if (snapshot.exists) return;

  await userRef.set({
    id: user.uid,
    full_name: user.displayName ?? '',
    email: user.email ?? '',
    photo_url: user.photoURL ?? null,
    provider: user.providerData?.[0]?.providerId ?? 'password',
    membership_type: 'basic',
    created_at: admin.firestore.FieldValue.serverTimestamp(),
    updated_at: admin.firestore.FieldValue.serverTimestamp()
  });
});

export const bookClass = onCall(async (request): Promise<CallableResponse<{ bookingId: string }>> => {
  if (!request.auth?.uid) {
    throw new HttpsError('unauthenticated', 'Authentication required.');
  }

  const parsed = classPayloadSchema.safeParse(request.data);
  if (!parsed.success) {
    throw new HttpsError('invalid-argument', parsed.error.message);
  }

  const userId = request.auth.uid;
  const classId = parsed.data.classId;
  const classRef = db.collection('classes').doc(classId);
  const bookingRef = db.collection('bookings').doc(`${userId}_${classId}`);

  await db.runTransaction(async (tx) => {
    const [classDoc, bookingDoc] = await Promise.all([tx.get(classRef), tx.get(bookingRef)]);
    if (!classDoc.exists) throw new HttpsError('not-found', 'Class not found.');

    const classData = classDoc.data() as { available_spots: number; title: string };
    if (bookingDoc.exists && bookingDoc.data()?.status === 'booked') {
      throw new HttpsError('already-exists', 'You already booked this class.');
    }

    if (classData.available_spots <= 0) {
      throw new HttpsError('failed-precondition', 'No spots available.');
    }

    tx.set(
      bookingRef,
      {
        id: bookingRef.id,
        user_id: userId,
        class_id: classId,
        status: 'booked',
        created_at: admin.firestore.FieldValue.serverTimestamp(),
        updated_at: admin.firestore.FieldValue.serverTimestamp()
      },
      { merge: true }
    );

    tx.update(classRef, {
      available_spots: admin.firestore.FieldValue.increment(-1),
      updated_at: admin.firestore.FieldValue.serverTimestamp()
    });
  });

  await sendBookingConfirmationInternal(userId, classId);

  return {
    success: true,
    message: 'Class booked successfully.',
    data: { bookingId: `${userId}_${classId}` }
  };
});

export const cancelBooking = onCall(async (request): Promise<CallableResponse> => {
  if (!request.auth?.uid) {
    throw new HttpsError('unauthenticated', 'Authentication required.');
  }

  const parsed = classPayloadSchema.safeParse(request.data);
  if (!parsed.success) {
    throw new HttpsError('invalid-argument', parsed.error.message);
  }

  const userId = request.auth.uid;
  const classId = parsed.data.classId;
  const classRef = db.collection('classes').doc(classId);
  const bookingRef = db.collection('bookings').doc(`${userId}_${classId}`);

  await db.runTransaction(async (tx) => {
    const [classDoc, bookingDoc] = await Promise.all([tx.get(classRef), tx.get(bookingRef)]);

    if (!classDoc.exists) throw new HttpsError('not-found', 'Class not found.');
    if (!bookingDoc.exists || bookingDoc.data()?.status !== 'booked') {
      throw new HttpsError('failed-precondition', 'No active booking found.');
    }

    tx.update(bookingRef, {
      status: 'cancelled',
      updated_at: admin.firestore.FieldValue.serverTimestamp()
    });

    tx.update(classRef, {
      available_spots: admin.firestore.FieldValue.increment(1),
      updated_at: admin.firestore.FieldValue.serverTimestamp()
    });
  });

  return { success: true, message: 'Booking cancelled successfully.' };
});

export const sendBookingConfirmation = onCall(async (request): Promise<CallableResponse> => {
  if (!request.auth?.uid) {
    throw new HttpsError('unauthenticated', 'Authentication required.');
  }

  const parsed = classPayloadSchema.safeParse(request.data);
  if (!parsed.success) {
    throw new HttpsError('invalid-argument', parsed.error.message);
  }

  await sendBookingConfirmationInternal(request.auth.uid, parsed.data.classId);
  return { success: true, message: 'Booking confirmation sent.' };
});

async function sendBookingConfirmationInternal(userId: string, classId: string): Promise<void> {
  const tokensSnapshot = await db.collection('notification_tokens').where('user_id', '==', userId).get();
  if (tokensSnapshot.empty) return;

  const classDoc = await db.collection('classes').doc(classId).get();
  const classData = classDoc.data() as { title?: string; date?: string; start_time?: string } | undefined;

  const tokens = tokensSnapshot.docs
    .map((doc) => doc.data().token as string)
    .filter((token) => !!token);

  if (tokens.length === 0) return;

  await admin.messaging().sendEachForMulticast({
    tokens,
    notification: {
      title: 'Booking Confirmed',
      body: `You're booked for ${classData?.title ?? 'your class'} on ${classData?.date ?? ''} ${classData?.start_time ?? ''}.`
    },
    data: {
      classId
    }
  });
}

export const sendClassReminder = onSchedule('every 15 minutes', async () => {
  const now = new Date();
  const reminderWindow = new Date(now.getTime() + 60 * 60 * 1000);

  const dateKey = reminderWindow.toISOString().slice(0, 10);
  const hourMinute = reminderWindow.toISOString().slice(11, 16);

  const classesSnapshot = await db
    .collection('classes')
    .where('date', '==', dateKey)
    .where('start_time', '==', hourMinute)
    .get();

  for (const classDoc of classesSnapshot.docs) {
    const gymClass = classDoc.data() as { id: string; title: string; date: string; start_time: string };
    const bookingsSnapshot = await db
      .collection('bookings')
      .where('class_id', '==', gymClass.id)
      .where('status', '==', 'booked')
      .get();

    for (const bookingDoc of bookingsSnapshot.docs) {
      const booking = bookingDoc.data() as { user_id: string };
      const tokenDocs = await db.collection('notification_tokens').where('user_id', '==', booking.user_id).get();
      const tokens = tokenDocs.docs.map((d) => d.data().token as string).filter(Boolean);

      if (!tokens.length) continue;

      await admin.messaging().sendEachForMulticast({
        tokens,
        notification: {
          title: 'Class Reminder',
          body: `${gymClass.title} starts at ${gymClass.start_time}. See you there!`
        },
        data: {
          classId: gymClass.id
        }
      });
    }
  }
});
