import express from "express";
import { createServer as createViteServer } from "vite";
import pkg from "pg";
const { Pool } = pkg;
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";
import oracledb from "oracledb";
import AdmZip from "adm-zip";

oracledb.fetchAsString = [oracledb.CLOB];
oracledb.outFormat = oracledb.OUT_FORMAT_OBJECT;

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const WALLET_DIR = path.join(process.cwd(), "oracle_wallet");
const CONFIG_FILE = path.join(process.cwd(), "server-config.json");
const LOCAL_DB_FILE = path.join(process.cwd(), "oracle-local-cache.json");

function readLocalDbStore(): Record<string, any> {
  try {
    if (fs.existsSync(LOCAL_DB_FILE)) {
      return JSON.parse(fs.readFileSync(LOCAL_DB_FILE, "utf-8"));
    }
  } catch (e) {
    console.error("Error reading local DB store:", e);
  }
  return {};
}

function writeLocalDbStore(data: Record<string, any>) {
  try {
    fs.writeFileSync(LOCAL_DB_FILE, JSON.stringify(data, null, 2), "utf-8");
  } catch (e) {
    console.error("Error writing local DB store:", e);
  }
}

const defaultOracleConfig = {
  user: "ADMIN",
  password: "Sveva310320@",
  serviceName: "clvycaz7vgdaak32_low",
  connectString: "(description= (retry_count=20)(retry_delay=3)(address=(protocol=tcps)(port=1522)(host=adb.eu-turin-1.oraclecloud.com))(connect_data=(service_name=g4baf80d64d08cb_clvycaz7vgdaak32_low.adb.oraclecloud.com))(security=(ssl_server_dn_match=yes)))",
  walletPassword: "Sveva310320@"
};

function readServerConfig() {
  try {
    if (fs.existsSync(CONFIG_FILE)) {
      return JSON.parse(fs.readFileSync(CONFIG_FILE, "utf-8"));
    }
  } catch (err) {
    console.error("Error reading server config:", err);
  }
  return {
    dbType: "oracle",
    oracle: defaultOracleConfig
  };
}

function writeServerConfig(cfg: any) {
  try {
    fs.writeFileSync(CONFIG_FILE, JSON.stringify(cfg, null, 2), "utf-8");
  } catch (err) {
    console.error("Error writing server config:", err);
  }
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json({ limit: '50mb' }));

  app.get("/api/health", (req, res) => {
    res.json({ status: "ok" });
  });

  // DB Config persistence
  app.get("/api/db/config", (req, res) => {
    const cfg = readServerConfig();
    res.json(cfg);
  });

  app.post("/api/db/config", (req, res) => {
    const current = readServerConfig();
    const updated = { ...current, ...req.body };
    writeServerConfig(updated);
    res.json({ success: true, config: updated });
  });

  // Oracle wallet inspection
  const getWalletStatus = () => {
    const exists = fs.existsSync(WALLET_DIR);
    if (!exists) {
      return { installed: false, files: [], services: [] };
    }
    const files = fs.readdirSync(WALLET_DIR);
    const services: string[] = [];
    const tnsPath = path.join(WALLET_DIR, "tnsnames.ora");
    if (fs.existsSync(tnsPath)) {
      try {
        const content = fs.readFileSync(tnsPath, "utf-8");
        const regex = /^\s*([a-zA-Z0-9_]+)\s*=/gm;
        let match;
        while ((match = regex.exec(content)) !== null) {
          services.push(match[1]);
        }
      } catch (e) {
        console.error("Error parsing tnsnames.ora:", e);
      }
    }
    return {
      installed: files.length > 0 && files.some(f => f.includes(".sso") || f.includes(".pem") || f.includes("tnsnames")),
      files,
      services
    };
  };

  app.get("/api/oracle/wallet-status", (req, res) => {
    res.json(getWalletStatus());
  });

  // Upload Oracle Wallet ZIP
  app.post("/api/oracle/upload-wallet", async (req, res) => {
    const { zipBase64, walletPassword } = req.body;
    if (!zipBase64) {
      return res.status(400).json({ success: false, error: "Nessun file zip ricevuto." });
    }

    try {
      if (!fs.existsSync(WALLET_DIR)) {
        fs.mkdirSync(WALLET_DIR, { recursive: true });
      }

      const cleanBase64 = zipBase64.replace(/^data:.*?;base64,/, '');
      const zipBuffer = Buffer.from(cleanBase64, 'base64');
      const zip = new AdmZip(zipBuffer);
      zip.extractAllTo(WALLET_DIR, true);

      // Adjust sqlnet.ora if present
      const sqlnetPath = path.join(WALLET_DIR, "sqlnet.ora");
      if (fs.existsSync(sqlnetPath)) {
        let sqlnetContent = fs.readFileSync(sqlnetPath, "utf-8");
        sqlnetContent = sqlnetContent.replace(
          /\(DIRECTORY\s*=\s*["'][^"']*["']\)/gi,
          `(DIRECTORY="${WALLET_DIR}")`
        );
        fs.writeFileSync(sqlnetPath, sqlnetContent, "utf-8");
      }

      // Read services
      const status = getWalletStatus();

      // Update server config
      const sCfg = readServerConfig();
      if (!sCfg.oracle) sCfg.oracle = { ...defaultOracleConfig };
      if (walletPassword) sCfg.oracle.walletPassword = walletPassword;
      if (status.services.length > 0 && !status.services.includes(sCfg.oracle.serviceName)) {
        sCfg.oracle.serviceName = status.services.find(s => s.endsWith("_low")) || status.services[0];
      }
      writeServerConfig(sCfg);

      // Try quick test connection
      let testSuccess = false;
      let testMessage = "";
      try {
        const conn = await getOracleConnection(sCfg.oracle);
        await ensureOracleTableExists(conn);

        // Migrate any local data to Oracle DB
        const localStore = readLocalDbStore();
        const keys = Object.keys(localStore);
        for (const k of keys) {
          const valStr = typeof localStore[k] === "string" ? localStore[k] : JSON.stringify(localStore[k]);
          await conn.execute(
            `MERGE INTO APP_DATA t
             USING (SELECT :k AS k, :v AS v FROM dual) s
             ON (t.KEY = s.k)
             WHEN MATCHED THEN
               UPDATE SET t.VALUE = s.v, t.UPDATED_AT = CURRENT_TIMESTAMP
             WHEN NOT MATCHED THEN
               INSERT (KEY, VALUE, UPDATED_AT) VALUES (s.k, s.v, CURRENT_TIMESTAMP)`,
            { k, v: valStr },
            { autoCommit: true }
          );
        }

        await conn.close();
        testSuccess = true;
        testMessage = `Wallet estratto e connessione Oracle verificata con successo! ${keys.length > 0 ? `Sincronizzati ${keys.length} record su Oracle Cloud.` : ''}`;
      } catch (connErr: any) {
        testMessage = "Wallet estratto, ma test connessione: " + connErr.message;
      }

      res.json({
        success: true,
        message: testMessage,
        connected: testSuccess,
        status
      });
    } catch (err: any) {
      console.error("Wallet upload error:", err);
      res.status(500).json({ success: false, error: err.message });
    }
  });

  let oraclePool: oracledb.Pool | null = null;
  const oracleState = {
    connected: false,
    poolActive: false,
    walletInstalled: false,
    lastSync: null as string | null,
    lastError: null as string | null,
    totalRecords: 0
  };

  const getOraclePool = async (config?: any): Promise<oracledb.Pool | null> => {
    if (oraclePool) {
      try {
        const testConn = await oraclePool.getConnection();
        await testConn.close();
        return oraclePool;
      } catch (e: any) {
        console.warn("Oracle pool needs reset:", e.message);
        try { await oraclePool.close(10); } catch (_) {}
        oraclePool = null;
      }
    }

    const sCfg = readServerConfig();
    const cfg = config || sCfg.oracle || defaultOracleConfig;
    const user = cfg?.user || "ADMIN";
    const password = cfg?.password || "Sveva310320@";
    const service = cfg?.serviceName || "clvycaz7vgdaak32_low";
    let connectString = cfg?.connectString || service;
    const walletPassword = cfg?.walletPassword || password;

    if (connectString) {
      connectString = connectString
        .replace(/retry_count\s*=\s*\d+/gi, "retry_count=1")
        .replace(/retry_delay\s*=\s*\d+/gi, "retry_delay=1");
    }

    const poolParams: any = {
      user,
      password,
      connectString,
      poolMin: 1,
      poolMax: 5,
      poolIncrement: 1,
      poolTimeout: 60
    };

    if (fs.existsSync(WALLET_DIR)) {
      const files = fs.readdirSync(WALLET_DIR);
      if (files.some(f => f.includes(".sso") || f.includes(".pem") || f.includes("tnsnames"))) {
        poolParams.walletLocation = WALLET_DIR;
        poolParams.configDir = WALLET_DIR;
        if (walletPassword) {
          poolParams.walletPassword = walletPassword;
        }
      }
    }

    try {
      const poolPromise = oracledb.createPool(poolParams);
      const timeoutPromise = new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error("Timeout creazione pool Oracle")), 4000)
      );
      oraclePool = await Promise.race([poolPromise, timeoutPromise]);
      // Verify actual connectivity with Oracle
      const testConn = await oraclePool.getConnection();
      await testConn.execute("SELECT 1 FROM dual");
      await testConn.close();
      oracleState.poolActive = true;
      oracleState.connected = true;
      oracleState.lastError = null;
      return oraclePool;
    } catch (err: any) {
      if (oraclePool) {
        try { await oraclePool.close(5); } catch (_) {}
        oraclePool = null;
      }
      oracleState.poolActive = false;
      oracleState.connected = false;
      oracleState.lastError = err.message;
      return null;
    }
  };

  const getOracleConnection = async (config?: any) => {
    // Try persistent pool first
    try {
      const pool = await getOraclePool(config);
      if (pool) {
        const pConn = await pool.getConnection();
        return pConn;
      }
    } catch (poolErr) {
      console.warn("Pool connection failed, fallback to direct:", poolErr);
    }

    // Direct single connection fallback
    const user = config?.user || "ADMIN";
    const password = config?.password || "Sveva310320@";
    const service = config?.serviceName || "clvycaz7vgdaak32_low";
    let connectString = config?.connectString || service;
    const walletPassword = config?.walletPassword || password;

    // Fast-fail: Avoid hanging on retry_count=20
    if (connectString) {
      connectString = connectString
        .replace(/retry_count\s*=\s*\d+/gi, "retry_count=1")
        .replace(/retry_delay\s*=\s*\d+/gi, "retry_delay=1");
    }

    const connParams: any = {
      user,
      password,
      connectString
    };

    if (fs.existsSync(WALLET_DIR)) {
      const files = fs.readdirSync(WALLET_DIR);
      if (files.some(f => f.includes(".sso") || f.includes(".pem") || f.includes("tnsnames"))) {
        connParams.walletLocation = WALLET_DIR;
        connParams.configDir = WALLET_DIR;
        if (walletPassword) {
          connParams.walletPassword = walletPassword;
        }
      }
    }

    const connPromise = oracledb.getConnection(connParams);
    const timeoutPromise = new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error("Timeout di connessione a Oracle Cloud dopo 5s. Verifica lo stato dell'istanza in Oracle Cloud o il wallet mTLS.")), 5000)
    );

    return await Promise.race([connPromise, timeoutPromise]);
  };

  const ensureOracleTableExists = async (conn: oracledb.Connection) => {
    try {
      const check = await conn.execute<any>(
        "SELECT table_name FROM user_tables WHERE table_name = 'APP_DATA'"
      );
      if (!check.rows || check.rows.length === 0) {
        await conn.execute(`
          CREATE TABLE APP_DATA (
            KEY VARCHAR2(255) PRIMARY KEY,
            VALUE CLOB,
            UPDATED_AT TIMESTAMP DEFAULT CURRENT_TIMESTAMP
          )
        `);
      }
    } catch (err: any) {
      if (!err.message?.includes("ORA-00955")) {
        console.error("Error creating Oracle table:", err.message);
        throw err;
      }
    }
  };

  // Oracle Test Connection
  app.post("/api/oracle/test", async (req, res) => {
    const config = req.body || {};
    const walletStatus = getWalletStatus();
    if (!walletStatus.installed) {
      return res.status(400).json({
        success: false,
        error: "Nessun file wallet (.zip) presente nel server. Carica il file Wallet_CLVYCAZ7VGDAAK32.zip scaricato da Oracle Cloud nella sezione sottostante prima di testare la connessione mTLS."
      });
    }

    try {
      const conn = await getOracleConnection(config);
      await ensureOracleTableExists(conn);
      const testRes = await conn.execute<any>("SELECT SYSDATE FROM DUAL");

      // Auto-sync any local records to Oracle
      const localStore = readLocalDbStore();
      const keys = Object.keys(localStore);
      if (keys.length > 0) {
        for (const k of keys) {
          const valStr = typeof localStore[k] === "string" ? localStore[k] : JSON.stringify(localStore[k]);
          await conn.execute(
            `MERGE INTO APP_DATA t
             USING (SELECT :k AS k, :v AS v FROM dual) s
             ON (t.KEY = s.k)
             WHEN MATCHED THEN
               UPDATE SET t.VALUE = s.v, t.UPDATED_AT = CURRENT_TIMESTAMP
             WHEN NOT MATCHED THEN
               INSERT (KEY, VALUE, UPDATED_AT) VALUES (s.k, s.v, CURRENT_TIMESTAMP)`,
            { k, v: valStr },
            { autoCommit: true }
          );
        }
      }

      await conn.close();

      const current = readServerConfig();
      current.dbType = "oracle";
      current.oracle = { ...current.oracle, ...config };
      writeServerConfig(current);

      oracleState.connected = true;
      oracleState.lastError = null;
      oracleState.lastSync = new Date().toISOString();

      res.json({
        success: true,
        message: `Connessione Oracle riuscita! Tabella APP_DATA verificata.${keys.length > 0 ? ` Sincronizzati ${keys.length} record su Oracle Cloud.` : ''}`,
        serverTime: testRes.rows?.[0]
      });
    } catch (err: any) {
      let msg = err.message || "";
      if (msg.includes("ORA-12506")) {
        msg = "Connessione rifiutata dal listener Oracle (ORA-12506). Verifica che l'Autonomous Database sia avviato, che la password ADMIN sia corretta ('Sveva310320@'), e che la lista di controllo degli accessi (ACL) in Oracle Cloud consenta connessioni da indirizzi esterni.";
      } else if (msg.includes("ORA-01017")) {
        msg = "Credenziali Oracle non valide (ORA-01017). Utente o password errati.";
      }
      oracleState.connected = false;
      oracleState.lastError = msg;
      console.warn("Oracle test warning:", msg);
      res.status(500).json({ success: false, error: msg });
    }
  });

  // Oracle Sync Key-Value
  app.post("/api/oracle/sync", async (req, res) => {
    const { key, data, config } = req.body;

    // Always persist to local cache first
    const localStore = readLocalDbStore();
    localStore[key] = data;
    writeLocalDbStore(localStore);

    const walletStatus = getWalletStatus();
    if (!walletStatus.installed) {
      return res.json({
        success: true,
        storedLocally: true,
        walletPending: true,
        message: "Salvato localmente. In attesa del caricamento del file Wallet per la sincronizzazione cloud."
      });
    }

    let conn: oracledb.Connection | null = null;
    try {
      conn = await getOracleConnection(config);
      await ensureOracleTableExists(conn);

      const valStr = typeof data === "string" ? data : JSON.stringify(data);
      await conn.execute(
        `MERGE INTO APP_DATA t
         USING (SELECT :k AS k, :v AS v FROM dual) s
         ON (t.KEY = s.k)
         WHEN MATCHED THEN
           UPDATE SET t.VALUE = s.v, t.UPDATED_AT = CURRENT_TIMESTAMP
         WHEN NOT MATCHED THEN
           INSERT (KEY, VALUE, UPDATED_AT) VALUES (s.k, s.v, CURRENT_TIMESTAMP)`,
        { k: key, v: valStr },
        { autoCommit: true }
      );

      res.json({ success: true, syncedToOracle: true });
    } catch (err: any) {
      console.warn("Oracle sync fallback (saved locally):", err.message);
      res.json({ success: true, storedLocally: true, oracleWarning: err.message });
    } finally {
      if (conn) {
        try { await conn.close(); } catch (_) {}
      }
    }
  });

  // Oracle Fetch Key-Value
  app.post("/api/oracle/fetch", async (req, res) => {
    const { key, config } = req.body;
    const walletStatus = getWalletStatus();

    // If wallet is not installed yet, immediately serve from local store without network delay
    if (!walletStatus.installed) {
      const localStore = readLocalDbStore();
      return res.json({
        success: true,
        data: localStore[key] !== undefined ? localStore[key] : null,
        walletPending: true
      });
    }

    let conn: oracledb.Connection | null = null;
    try {
      conn = await getOracleConnection(config);
      await ensureOracleTableExists(conn);

      const result = await conn.execute<any>(
        "SELECT VALUE FROM APP_DATA WHERE KEY = :k",
        { k: key }
      );

      if (result.rows && result.rows.length > 0) {
        const raw = result.rows[0].VALUE;
        let parsed = null;
        try {
          parsed = JSON.parse(raw);
        } catch (_) {
          parsed = raw;
        }

        // Cache locally as well
        const localStore = readLocalDbStore();
        localStore[key] = parsed;
        writeLocalDbStore(localStore);

        res.json({ success: true, data: parsed });
      } else {
        const localStore = readLocalDbStore();
        res.json({ success: true, data: localStore[key] !== undefined ? localStore[key] : null });
      }
    } catch (err: any) {
      console.warn("Oracle fetch fallback to local store:", err.message);
      const localStore = readLocalDbStore();
      res.json({
        success: true,
        data: localStore[key] !== undefined ? localStore[key] : null,
        offline: true,
        warning: err.message
      });
    } finally {
      if (conn) {
        try { await conn.close(); } catch (_) {}
      }
    }
  });

  // Oracle Export All Data
  app.post("/api/oracle/export", async (req, res) => {
    const { config } = req.body;
    const walletStatus = getWalletStatus();

    if (!walletStatus.installed) {
      const localStore = readLocalDbStore();
      const rows = Object.entries(localStore).map(([key, value]) => ({
        key,
        value: typeof value === "string" ? value : JSON.stringify(value)
      }));
      return res.json({ success: true, data: rows });
    }

    let conn: oracledb.Connection | null = null;
    try {
      conn = await getOracleConnection(config);
      await ensureOracleTableExists(conn);

      const result = await conn.execute<any>("SELECT KEY, VALUE FROM APP_DATA");
      const rows = (result.rows || []).map((r: any) => ({
        key: r.KEY,
        value: r.VALUE
      }));

      res.json({ success: true, data: rows });
    } catch (err: any) {
      console.warn("Oracle export fallback to local store:", err.message);
      const localStore = readLocalDbStore();
      const rows = Object.entries(localStore).map(([key, value]) => ({
        key,
        value: typeof value === "string" ? value : JSON.stringify(value)
      }));
      res.json({ success: true, data: rows });
    } finally {
      if (conn) {
        try { await conn.close(); } catch (_) {}
      }
    }
  });

  // Oracle Import All Data
  app.post("/api/oracle/import", async (req, res) => {
    const { config, data } = req.body;
    
    // Save to local store
    const localStore = readLocalDbStore();
    for (const item of (data || [])) {
      try {
        localStore[item.key] = typeof item.value === "string" ? JSON.parse(item.value) : item.value;
      } catch (_) {
        localStore[item.key] = item.value;
      }
    }
    writeLocalDbStore(localStore);

    const walletStatus = getWalletStatus();
    if (!walletStatus.installed) {
      return res.json({ success: true, importedLocally: true });
    }

    let conn: oracledb.Connection | null = null;
    try {
      conn = await getOracleConnection(config);
      await ensureOracleTableExists(conn);

      for (const item of (data || [])) {
        const valStr = typeof item.value === "string" ? item.value : JSON.stringify(item.value);
        await conn.execute(
          `MERGE INTO APP_DATA t
           USING (SELECT :k AS k, :v AS v FROM dual) s
           ON (t.KEY = s.k)
           WHEN MATCHED THEN
             UPDATE SET t.VALUE = s.v, t.UPDATED_AT = CURRENT_TIMESTAMP
           WHEN NOT MATCHED THEN
             INSERT (KEY, VALUE, UPDATED_AT) VALUES (s.k, s.v, CURRENT_TIMESTAMP)`,
          { k: item.key, v: valStr },
          { autoCommit: true }
        );
      }
      res.json({ success: true, importedToOracle: true });
    } catch (err: any) {
      console.warn("Oracle import warning (imported locally):", err.message);
      res.json({ success: true, importedLocally: true, oracleWarning: err.message });
    } finally {
      if (conn) {
        try { await conn.close(); } catch (_) {}
      }
    }
  });

  // Oracle status & persistent connection health
  app.get("/api/oracle/status", (req, res) => {
    const wallet = getWalletStatus();
    const localStore = readLocalDbStore();
    oracleState.walletInstalled = wallet.installed;
    oracleState.totalRecords = Object.keys(localStore).length;
    res.json({
      success: true,
      ...oracleState,
      wallet
    });
  });

  // Background persistent synchronizer from local persistent store to Oracle
  const syncPersistentLocalToOracle = async () => {
    const wallet = getWalletStatus();
    if (!wallet.installed) return;
    const localStore = readLocalDbStore();
    const keys = Object.keys(localStore);
    if (keys.length === 0) return;

    let conn: oracledb.Connection | null = null;
    try {
      conn = await getOracleConnection();
      await ensureOracleTableExists(conn);

      for (const k of keys) {
        const valStr = typeof localStore[k] === "string" ? localStore[k] : JSON.stringify(localStore[k]);
        await conn.execute(
          `MERGE INTO APP_DATA t
           USING (SELECT :k AS k, :v AS v FROM dual) s
           ON (t.KEY = s.k)
           WHEN MATCHED THEN
             UPDATE SET t.VALUE = s.v, t.UPDATED_AT = CURRENT_TIMESTAMP
           WHEN NOT MATCHED THEN
             INSERT (KEY, VALUE, UPDATED_AT) VALUES (s.k, s.v, CURRENT_TIMESTAMP)`,
          { k, v: valStr },
          { autoCommit: true }
        );
      }
      oracleState.connected = true;
      oracleState.lastSync = new Date().toISOString();
      oracleState.lastError = null;
    } catch (err: any) {
      oracleState.connected = false;
      oracleState.lastError = err.message;
    } finally {
      if (conn) {
        try { await conn.close(); } catch (_) {}
      }
    }
  };

  // Run auto-sync & health check every 25 seconds in the background
  setInterval(() => {
    syncPersistentLocalToOracle().catch(() => {});
  }, 25000);

  // Keep a global pool for the active pg connection
  let activePool: pkg.Pool | null = null;
  let activeConfigHash = "";

  const getDbPool = (config: any) => {
    const configHash = JSON.stringify(config);
    if (activePool && activeConfigHash === configHash) {
      return activePool;
    }
    
    if (activePool) {
      activePool.end();
    }
    
    if (!config.password) {
      throw new Error("Manca la password del database. Inseriscila nelle impostazioni.");
    }

    activePool = new Pool({
      host: config.host,
      port: Number(config.port) || 5432,
      user: config.user,
      password: String(config.password),
      database: config.database,
      ssl: { rejectUnauthorized: false }
    });
    activeConfigHash = configHash;
    return activePool;
  };

  const ensureTableExists = async (pool: pkg.Pool) => {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS app_data (
        key VARCHAR(255) PRIMARY KEY,
        value TEXT,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
  };

  app.post("/api/test-db", async (req, res) => {
    try {
      const pool = getDbPool(req.body);
      const client = await pool.connect();
      await ensureTableExists(pool);
      client.release();
      res.json({ success: true });
    } catch (error: any) {
      console.error("Postgres connection error:", error.message);
      res.status(500).json({ success: false, error: error.message });
    }
  });

  app.post("/api/db/sync", async (req, res) => {
    const { key, data, config } = req.body;
    try {
      if (!config || !config.host) return res.status(400).json({ error: "Missing config" });
      const pool = getDbPool(config);
      await ensureTableExists(pool);
      
      await pool.query(
        `INSERT INTO app_data (key, value, updated_at) 
         VALUES ($1, $2, CURRENT_TIMESTAMP) 
         ON CONFLICT (key) 
         DO UPDATE SET value = EXCLUDED.value, updated_at = CURRENT_TIMESTAMP`,
        [key, JSON.stringify(data)]
      );
      res.json({ success: true });
    } catch (error: any) {
      console.error("DB Sync error:", error.message);
      res.status(500).json({ success: false, error: error.message });
    }
  });

  app.post("/api/db/fetch", async (req, res) => {
    const { key, config } = req.body;
    try {
      if (!config || !config.host) return res.status(400).json({ error: "Missing config" });
      const pool = getDbPool(config);
      await ensureTableExists(pool);
      
      const result = await pool.query(`SELECT value FROM app_data WHERE key = $1`, [key]);
      
      if (result.rows.length > 0) {
        res.json({ success: true, data: JSON.parse(result.rows[0].value) });
      } else {
        res.json({ success: true, data: null });
      }
    } catch (error: any) {
      console.error("DB Fetch error:", error.message);
      res.status(500).json({ success: false, error: error.message });
    }
  });

  app.post("/api/db/export", async (req, res) => {
    const { config } = req.body;
    try {
      if (!config || !config.host) return res.status(400).json({ error: "Missing config" });
      const pool = getDbPool(config);
      await ensureTableExists(pool);
      
      const result = await pool.query(`SELECT key, value FROM app_data`);
      res.json({ success: true, data: result.rows });
    } catch (error: any) {
      console.error("DB Export error:", error.message);
      res.status(500).json({ success: false, error: error.message });
    }
  });

  app.post("/api/db/import", async (req, res) => {
    const { config, data } = req.body;
    try {
      if (!config || !config.host) return res.status(400).json({ error: "Missing config" });
      const pool = getDbPool(config);
      await ensureTableExists(pool);
      
      const client = await pool.connect();
      try {
        await client.query('BEGIN');
        for (const item of data) {
           await client.query(
             `INSERT INTO app_data (key, value, updated_at) 
              VALUES ($1, $2, CURRENT_TIMESTAMP) 
              ON CONFLICT (key) 
              DO UPDATE SET value = EXCLUDED.value, updated_at = CURRENT_TIMESTAMP`,
             [item.key, item.value]
           );
        }
        await client.query('COMMIT');
        res.json({ success: true });
      } catch(e) {
        await client.query('ROLLBACK');
        throw e;
      } finally {
        client.release();
      }
    } catch (error: any) {
      console.error("DB Import error:", error.message);
      res.status(500).json({ success: false, error: error.message });
    }
  });

  app.post("/api/gemini", async (req, res) => {
    try {
      if (!process.env.GEMINI_API_KEY) {
         return res.status(500).json({ error: "Chiave Google interna non configurata sul server." });
      }
      const rawKey = process.env.GEMINI_API_KEY.trim();
      if (rawKey === 'MY_GEMINI_API_KEY') {
         return res.status(500).json({ error: "Ho rimosso il vincolo. Ora ricarica la pagina intera (F5), poi vai in Impostazioni -> Secrets (Environment Variables) e clicca sull'icona del cestino per eliminare la riga GEMINI_API_KEY. Una volta fatto, ricarica la pagina e funzionerà." });
      }
      const { GoogleGenAI } = await import("@google/genai");
      
      const ai = new GoogleGenAI({ apiKey: rawKey });
      const { systemInstruction, contents, model = "gemini-2.5-flash" } = req.body;
      
      try {
        const response = await ai.models.generateContent({
          model,
          contents,
          config: {
            systemInstruction,
          }
        });
        res.json({ text: response.text });
      } catch (gen_e: any) {
         res.status(500).json({ error: gen_e.message });
      }
    } catch(e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
    // Initialize persistent Oracle pool & sync in background
    getOraclePool().then(() => {
      syncPersistentLocalToOracle().catch(() => {});
    }).catch(() => {});
  });
}

startServer();
