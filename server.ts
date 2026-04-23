import express from "express";
import { createServer as createViteServer } from "vite";
import pkg from "pg";
const { Pool } = pkg;
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json({ limit: '10mb' }));

  app.get("/api/health", (req, res) => {
    res.json({ status: "ok" });
  });

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
  });
}

startServer();
