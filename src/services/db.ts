import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '../firebase';

export const defaultOracleConfig = {
  user: "ADMIN",
  password: "Sveva310320@",
  serviceName: "clvycaz7vgdaak32_low",
  connectString: "(description= (retry_count=20)(retry_delay=3)(address=(protocol=tcps)(port=1522)(host=adb.eu-turin-1.oraclecloud.com))(connect_data=(service_name=g4baf80d64d08cb_clvycaz7vgdaak32_low.adb.oraclecloud.com))(security=(ssl_server_dn_match=yes)))",
  walletPassword: "Sveva310320@"
};

export const getOracleConfig = () => {
  const raw = localStorage.getItem('customOracleConfig');
  if (raw) {
    try {
      return { ...defaultOracleConfig, ...JSON.parse(raw) };
    } catch (_) {}
  }
  return defaultOracleConfig;
};

export const getActiveDbType = (): string => {
  const current = localStorage.getItem('appDbType');
  if (!current || current === 'firebase') {
    localStorage.setItem('appDbType', 'oracle');
    return 'oracle';
  }
  return current;
};

export const getBackendOracleStatus = async () => {
  try {
    const res = await fetch('/api/oracle/status');
    if (!res.ok) throw new Error("HTTP " + res.status);
    return await res.json();
  } catch (err: any) {
    return { success: false, connected: false, error: err.message };
  }
};

export const syncToFirestore = async (key: string, data: any) => {
  const dbType = getActiveDbType();

  if (dbType === 'oracle') {
    const config = getOracleConfig();
    try {
      try { localStorage.setItem('cached_' + key, JSON.stringify(data)); } catch (_) {}
      const resp = await fetch('/api/oracle/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key, data, config })
      });
      const json = await resp.json();
      if (!json.success && !json.storedLocally) {
        console.warn("Oracle sync warning:", json.error || json.message);
      }
    } catch (err: any) {
      console.warn("Oracle sync network warning (persisted locally):", err.message);
    }
    return;
  }

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
  const dbType = getActiveDbType();

  if (dbType === 'oracle') {
    const config = getOracleConfig();
    try {
      const res = await fetch('/api/oracle/fetch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key, config })
      });
      const json = await res.json();
      if (json.success && json.data !== null && json.data !== undefined) {
        try { localStorage.setItem('cached_' + key, JSON.stringify(json.data)); } catch(_) {}
        return json.data;
      }
    } catch (err: any) {
      console.warn("Oracle fetch fallback to local storage:", err.message);
    }

    const cached = localStorage.getItem('cached_' + key);
    if (cached) {
      try {
        return JSON.parse(cached);
      } catch (_) {}
    }
    return null;
  }

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
  const defaultDbType = import.meta.env.VITE_DEFAULT_DB_TYPE || 'oracle';
  const dbType = localStorage.getItem('appDbType') || defaultDbType;

  if (dbType === 'oracle') {
    const config = getOracleConfig();
    const res = await fetch('/api/oracle/export', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ config })
    });
    const json = await res.json();
    if (!json.success) throw new Error(json.error || "Failed to export from Oracle");
    return json.data;
  }

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
  const defaultDbType = import.meta.env.VITE_DEFAULT_DB_TYPE || 'oracle';
  const dbType = localStorage.getItem('appDbType') || defaultDbType;

  if (dbType === 'oracle') {
    const config = getOracleConfig();
    const res = await fetch('/api/oracle/import', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ config, data })
    });
    const json = await res.json();
    if (!json.success) throw new Error(json.error || "Failed to import into Oracle");
    return;
  }

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
