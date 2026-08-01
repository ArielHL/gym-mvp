"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.sendClassReminder = exports.sendBookingConfirmation = exports.cancelBooking = exports.bookClass = exports.createUserProfileOnFirstLogin = void 0;
const admin = __importStar(require("firebase-admin"));
const functionsV1 = __importStar(require("firebase-functions"));
const https_1 = require("firebase-functions/v2/https");
const scheduler_1 = require("firebase-functions/v2/scheduler");
const zod_1 = require("zod");
admin.initializeApp();
const db = admin.firestore();
const classPayloadSchema = zod_1.z.object({ classId: zod_1.z.string().min(1) });
exports.createUserProfileOnFirstLogin = functionsV1.auth.user().onCreate(async (user) => {
    if (!user)
        return;
    const userRef = db.collection('users').doc(user.uid);
    const snapshot = await userRef.get();
    if (snapshot.exists)
        return;
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
exports.bookClass = (0, https_1.onCall)(async (request) => {
    if (!request.auth?.uid) {
        throw new https_1.HttpsError('unauthenticated', 'Authentication required.');
    }
    const parsed = classPayloadSchema.safeParse(request.data);
    if (!parsed.success) {
        throw new https_1.HttpsError('invalid-argument', parsed.error.message);
    }
    const userId = request.auth.uid;
    const classId = parsed.data.classId;
    const classRef = db.collection('classes').doc(classId);
    const bookingRef = db.collection('bookings').doc(`${userId}_${classId}`);
    await db.runTransaction(async (tx) => {
        const [classDoc, bookingDoc] = await Promise.all([tx.get(classRef), tx.get(bookingRef)]);
        if (!classDoc.exists)
            throw new https_1.HttpsError('not-found', 'Class not found.');
        const classData = classDoc.data();
        if (bookingDoc.exists && bookingDoc.data()?.status === 'booked') {
            throw new https_1.HttpsError('already-exists', 'You already booked this class.');
        }
        if (classData.available_spots <= 0) {
            throw new https_1.HttpsError('failed-precondition', 'No spots available.');
        }
        tx.set(bookingRef, {
            id: bookingRef.id,
            user_id: userId,
            class_id: classId,
            status: 'booked',
            created_at: admin.firestore.FieldValue.serverTimestamp(),
            updated_at: admin.firestore.FieldValue.serverTimestamp()
        }, { merge: true });
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
exports.cancelBooking = (0, https_1.onCall)(async (request) => {
    if (!request.auth?.uid) {
        throw new https_1.HttpsError('unauthenticated', 'Authentication required.');
    }
    const parsed = classPayloadSchema.safeParse(request.data);
    if (!parsed.success) {
        throw new https_1.HttpsError('invalid-argument', parsed.error.message);
    }
    const userId = request.auth.uid;
    const classId = parsed.data.classId;
    const classRef = db.collection('classes').doc(classId);
    const bookingRef = db.collection('bookings').doc(`${userId}_${classId}`);
    await db.runTransaction(async (tx) => {
        const [classDoc, bookingDoc] = await Promise.all([tx.get(classRef), tx.get(bookingRef)]);
        if (!classDoc.exists)
            throw new https_1.HttpsError('not-found', 'Class not found.');
        if (!bookingDoc.exists || bookingDoc.data()?.status !== 'booked') {
            throw new https_1.HttpsError('failed-precondition', 'No active booking found.');
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
exports.sendBookingConfirmation = (0, https_1.onCall)(async (request) => {
    if (!request.auth?.uid) {
        throw new https_1.HttpsError('unauthenticated', 'Authentication required.');
    }
    const parsed = classPayloadSchema.safeParse(request.data);
    if (!parsed.success) {
        throw new https_1.HttpsError('invalid-argument', parsed.error.message);
    }
    await sendBookingConfirmationInternal(request.auth.uid, parsed.data.classId);
    return { success: true, message: 'Booking confirmation sent.' };
});
async function sendBookingConfirmationInternal(userId, classId) {
    const tokensSnapshot = await db.collection('notification_tokens').where('user_id', '==', userId).get();
    if (tokensSnapshot.empty)
        return;
    const classDoc = await db.collection('classes').doc(classId).get();
    const classData = classDoc.data();
    const tokens = tokensSnapshot.docs
        .map((doc) => doc.data().token)
        .filter((token) => !!token);
    if (tokens.length === 0)
        return;
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
exports.sendClassReminder = (0, scheduler_1.onSchedule)('every 15 minutes', async () => {
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
        const gymClass = classDoc.data();
        const bookingsSnapshot = await db
            .collection('bookings')
            .where('class_id', '==', gymClass.id)
            .where('status', '==', 'booked')
            .get();
        for (const bookingDoc of bookingsSnapshot.docs) {
            const booking = bookingDoc.data();
            const tokenDocs = await db.collection('notification_tokens').where('user_id', '==', booking.user_id).get();
            const tokens = tokenDocs.docs.map((d) => d.data().token).filter(Boolean);
            if (!tokens.length)
                continue;
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
