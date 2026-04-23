import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '../firebase';

export const syncToFirestore = async (key: string, data: any) => {
  const dbType = localStorage.getItem('appDbType') || 'postgres'; // default to postgres

  if (dbType === 'postgres') {
    const rawConfig = localStorage.getItem('customPostgresConfig');
    if (!rawConfig) {
      throw new Error("Nessuna configurazione Postgres trovata. Vai nelle Impostazioni.");
    }
    const config = JSON.parse(rawConfig);
    
    if (!config.password) {
      throw new Error("Manca la password Supabase nelle Impostazioni. Il salvataggio reale fallirà senza di essa.");
    }

    try {
      const resp = await fetch('/api/db/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key, data, config })
      });
      const json = await resp.json();
      if (!json.success) {
        throw new Error(json.error || "Errore DB");
      }
    } catch (err: any) {
      console.error("DB Sync error: " + err.message);
      throw err;
    }
    return;
  }

  // Firebase fallback
  try {
    const docRef = doc(db, 'appData', key);
    await setDoc(docRef, { value: JSON.stringify(data), updatedAt: new Date().toISOString() });
  } catch (error) {
    console.error("Error syncing to Firestore:", key, error);
    throw error;
  }
};

export const fetchFromFirestore = async (key: string) => {
  const dbType = localStorage.getItem('appDbType') || 'postgres'; // default to postgres

  if (dbType === 'postgres') {
    const rawConfig = localStorage.getItem('customPostgresConfig');
    if (!rawConfig) {
      throw new Error("Nessuna configurazione Postgres trovata. Vai nelle Impostazioni.");
    }
    const config = JSON.parse(rawConfig);

    if (!config.password) {
      throw new Error("Manca la password Supabase nelle Impostazioni. Caricamento fallito.");
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
      } else {
        throw new Error(json.error || "Errore DB");
      }
    } catch (err: any) {
      console.error("DB Fetch error: " + err.message);
      throw err;
    }
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
    throw error;
  }
  return null;
};
