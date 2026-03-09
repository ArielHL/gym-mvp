import { collection, getDocs, orderBy, query, where } from 'firebase/firestore';
import { db } from '@/services/firebase/client';
import type { GymClass } from '@/types/models';

export async function fetchClassesByDate(date: string): Promise<GymClass[]> {
  const classesRef = collection(db, 'classes');
  const q = query(classesRef, where('date', '==', date), orderBy('start_time', 'asc'));
  const snapshot = await getDocs(q);
  return snapshot.docs.map((doc) => doc.data() as GymClass);
}
