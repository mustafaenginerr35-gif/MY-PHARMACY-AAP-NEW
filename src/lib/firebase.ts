import { initializeApp, getApp, getApps } from 'firebase/app';
import { getAuth, setPersistence, browserLocalPersistence, onAuthStateChanged } from 'firebase/auth';
import { initializeFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';
import firebaseConfig from '../../firebase-applet-config.json';

console.log("[FirebaseInit] Loading configuration for project:", firebaseConfig.projectId);

const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
export const auth = getAuth(app);

// Use initializeFirestore with experimentalForceLongPolling to avoid hanging stream errors in iframe
export const db = initializeFirestore(app, {
  experimentalForceLongPolling: true,
}, (firebaseConfig as any).firestoreDatabaseId);

export const storage = getStorage(app);

// Connectivity check
onAuthStateChanged(auth, (user) => {
  if (user) {
    console.log("Connected to Firebase project:", firebaseConfig.projectId);
  }
});

setPersistence(auth, browserLocalPersistence);
