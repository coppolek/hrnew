import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import defaultFirebaseConfig from '../firebase-applet-config.json';

// Allow overriding config from UI without needing a backend reload
const getFirebaseConfig = () => {
  try {
    const stored = localStorage.getItem('customFirebaseConfig');
    if (stored) {
      return JSON.parse(stored);
    }
  } catch (e) {
    console.error("Failed to parse custom firebase config", e);
  }
  return defaultFirebaseConfig;
};

export const activeFirebaseConfig = getFirebaseConfig();

const app = initializeApp(activeFirebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app, activeFirebaseConfig.firestoreDatabaseId);
export const googleProvider = new GoogleAuthProvider();
