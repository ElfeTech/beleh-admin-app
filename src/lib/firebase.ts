import { initializeApp, type FirebaseOptions } from 'firebase/app';
import {
  getAuth,
  GoogleAuthProvider,
  setPersistence,
  browserLocalPersistence,
} from 'firebase/auth';

const FIREBASE_ENV_KEYS = [
  'VITE_FIREBASE_API_KEY',
  'VITE_FIREBASE_AUTH_DOMAIN',
  'VITE_FIREBASE_PROJECT_ID',
  'VITE_FIREBASE_STORAGE_BUCKET',
  'VITE_FIREBASE_MESSAGING_SENDER_ID',
  'VITE_FIREBASE_APP_ID',
] as const;

function loadFirebaseOptions(): FirebaseOptions {
  const env = import.meta.env;
  const missing: string[] = [];
  for (const key of FIREBASE_ENV_KEYS) {
    const value = env[key];
    if (typeof value !== 'string' || value.trim() === '') {
      missing.push(key);
    }
  }
  if (missing.length > 0) {
    console.warn(
      `[Firebase] Missing or empty environment variables: ${missing.join(', ')}. ` +
        'Authentication might fail.',
    );
  }
  return {
    apiKey: env.VITE_FIREBASE_API_KEY as string,
    authDomain: env.VITE_FIREBASE_AUTH_DOMAIN as string,
    projectId: env.VITE_FIREBASE_PROJECT_ID as string,
    storageBucket: env.VITE_FIREBASE_STORAGE_BUCKET as string,
    messagingSenderId: env.VITE_FIREBASE_MESSAGING_SENDER_ID as string,
    appId: env.VITE_FIREBASE_APP_ID as string,
  };
}

const firebaseConfig = loadFirebaseOptions();
const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);

setPersistence(auth, browserLocalPersistence).catch((error) => {
  console.error('Error setting persistence:', error);
});

export function getGoogleProvider(): GoogleAuthProvider {
  return new GoogleAuthProvider();
}
