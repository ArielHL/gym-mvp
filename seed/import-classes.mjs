import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore, Timestamp } from 'firebase-admin/firestore';
import fs from 'node:fs/promises';
import path from 'node:path';

const serviceAccountPath = process.env.GOOGLE_APPLICATION_CREDENTIALS;
if (!serviceAccountPath) {
  console.error('Set GOOGLE_APPLICATION_CREDENTIALS to your service account JSON path.');
  process.exit(1);
}

const serviceAccount = JSON.parse(await fs.readFile(serviceAccountPath, 'utf-8'));
initializeApp({ credential: cert(serviceAccount) });

const db = getFirestore();
const filePath = path.resolve('seed/classes.seed.json');
const classes = JSON.parse(await fs.readFile(filePath, 'utf-8'));

const batch = db.batch();
for (const item of classes) {
  const ref = db.collection('classes').doc(item.id);
  batch.set(ref, {
    ...item,
    created_at: Timestamp.fromDate(new Date(item.created_at)),
    updated_at: Timestamp.fromDate(new Date(item.updated_at))
  });
}

await batch.commit();
console.log(`Seeded ${classes.length} classes.`);
