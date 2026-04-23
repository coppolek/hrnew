import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '../firebase';

export const syncToFirestore = async (key: string, data: any) => {
  const dbType = localStorage.getItem('appDbType') || 'postgres'; // default to postgres

  if (dbType === 'postgres') {
    const rawConfig = localStorage.getItem('customPostgresConfig');
    if (!rawConfig) {
      console.warn("No postgres config found");
      return;
    }
    const config = JSON.parse(rawConfig);
    
    if (!config.password) {
      console.warn("Manca la password del database postgres. Sincronizzazione saltata.");
      return;
    }

    try {
      await fetch('/api/db/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key, data, config })
      });
    } catch (err) {
      console.error("Error syncing to Postgres", err);
    }
    return;
  }

  // Firebase fallback
  try {
    const docRef = doc(db, 'appData', key);
    await setDoc(docRef, { value: JSON.stringify(data), updatedAt: new Date().toISOString() });
  } catch (error) {
    console.error("Error syncing to Firestore:", key, error);
  }
};

export const fetchFromFirestore = async (key: string) => {
  const dbType = localStorage.getItem('appDbType') || 'postgres'; // default to postgres

  if (dbType === 'postgres') {
    const rawConfig = localStorage.getItem('customPostgresConfig');
    if (!rawConfig) {
      console.warn("No postgres config found");
      return null;
    }
    const config = JSON.parse(rawConfig);

    if (!config.password) {
      console.warn("Manca la password del database postgres. Fetch saltato.");
      return null;
    }

    try {
      const res = await fetch('/api/db/fetch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key, config })
      });
      const json = await res.json();
      if (json.success) {
        return json.data; // already object
      }
    } catch (err) {
      console.error("Error fetching from Postgres", err);
    }
    return null;
  }

  // Firebase fallback
  try {
    const docRef = doc(db, 'appData', key);
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      return JSON.parse(docSnap.data().value);
    }
  } catch (error) {
    console.error("Error fetching from Firestore:", key, error);
  }
  return null;
};
