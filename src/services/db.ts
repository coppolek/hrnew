import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '../firebase';

export const syncToFirestore = async (key: string, data: any) => {
  const defaultDbType = import.meta.env.VITE_DEFAULT_DB_TYPE || 'postgres';
  const dbType = localStorage.getItem('appDbType') || defaultDbType; // default to postgres

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
  const defaultDbType = import.meta.env.VITE_DEFAULT_DB_TYPE || 'postgres';
  const dbType = localStorage.getItem('appDbType') || defaultDbType; // default to postgres

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

export const exportAllData = async () => {
  const defaultDbType = import.meta.env.VITE_DEFAULT_DB_TYPE || 'postgres';
  const dbType = localStorage.getItem('appDbType') || defaultDbType;

  if (dbType === 'postgres') {
    const rawConfig = localStorage.getItem('customPostgresConfig');
    if (!rawConfig) throw new Error("Nessuna configurazione Postgres trovata.");
    const config = JSON.parse(rawConfig);
    if (!config.password) throw new Error("Manca password Supabase.");

    const res = await fetch('/api/db/export', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ config })
    });
    const json = await res.json();
    if (!json.success) throw new Error(json.error || "Failed to export");
    return json.data; 
  } else {
    // Firebase
    const { collection, getDocs } = await import('firebase/firestore');
    const snap = await getDocs(collection(db, 'appData'));
    const allData: any[] = [];
    snap.forEach(d => {
      allData.push({ key: d.id, value: d.data().value });
    });
    return allData;
  }
};

export const importAllData = async (data: any[]) => {
  const defaultDbType = import.meta.env.VITE_DEFAULT_DB_TYPE || 'postgres';
  const dbType = localStorage.getItem('appDbType') || defaultDbType;

  if (dbType === 'postgres') {
    const rawConfig = localStorage.getItem('customPostgresConfig');
    if (!rawConfig) throw new Error("Nessuna configurazione Postgres trovata.");
    const config = JSON.parse(rawConfig);
    if (!config.password) throw new Error("Manca password Supabase.");

    const res = await fetch('/api/db/import', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ config, data })
    });
    const json = await res.json();
    if (!json.success) throw new Error(json.error || "Failed to import");
  } else {
    for (const item of data) {
      if (item.key && item.value) {
        // Need to parse if importing into key-values, but we just use syncToFirestore which expects object. Wait, appData stores {value: stringified}.
        // If we use stringified values, we need to parse them before syncing
        try {
           const parsedValue = JSON.parse(item.value);
           await syncToFirestore(item.key, parsedValue);
        } catch(e) {
           console.error("Failed to parse " + item.key, e);
        }
      }
    }
  }
};
