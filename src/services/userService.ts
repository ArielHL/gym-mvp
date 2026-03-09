import { doc, getDoc, serverTimestamp, setDoc, updateDoc } from 'firebase/firestore';
import type { User } from 'firebase/auth';
import { db } from '@/services/firebase/client';

export async function createUserProfileIfMissing(user: User): Promise<void> {
  const ref = doc(db, 'users', user.uid);
  const snapshot = await getDoc(ref);

  if (!snapshot.exists()) {
    await setDoc(ref, {
      id: user.uid,
      full_name: user.displayName ?? '',
      email: user.email ?? '',
      photo_url: user.photoURL ?? null,
      provider: user.providerData[0]?.providerId ?? 'password',
      membership_type: 'basic',
      created_at: serverTimestamp(),
      updated_at: serverTimestamp()
    });
  } else {
    await updateDoc(ref, {
      photo_url: user.photoURL ?? null,
      updated_at: serverTimestamp()
    });
  }
}
