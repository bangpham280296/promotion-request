import sql from "mssql";

const config: sql.config = {
  server: process.env.SQL_SERVER_HOST!,
  port: parseInt(process.env.SQL_SERVER_PORT ?? "1433"),
  database: process.env.SQL_SERVER_DATABASE!,
  user: process.env.SQL_SERVER_USER!,
  password: process.env.SQL_SERVER_PASSWORD!,
  options: {
    trustServerCertificate: true,
    encrypt: false,
  },
  pool: {
    max: 10,
    min: 2,
    idleTimeoutMillis: 30000,
  },
  connectionTimeout: 8000,
  requestTimeout: 15000,
};

// Maintain singleton pool on globalThis across Next.js Hot Module Reloads (HMR)
declare global {
  // eslint-disable-next-line no-var
  var _mssqlPoolPromise: Promise<sql.ConnectionPool> | undefined;
}

export async function getSqlPool(): Promise<sql.ConnectionPool> {
  if (!globalThis._mssqlPoolPromise) {
    globalThis._mssqlPoolPromise = new sql.ConnectionPool(config)
      .connect()
      .then((pool) => {
        pool.on("error", (err) => {
          console.error("[MSSQL Pool Error]:", err);
          // Invalidate pool on fatal error so next request reconnects
          globalThis._mssqlPoolPromise = undefined;
        });
        return pool;
      })
      .catch((err) => {
        console.error("[MSSQL Connection Error]:", err);
        globalThis._mssqlPoolPromise = undefined;
        throw err;
      });
  }

  return globalThis._mssqlPoolPromise;
}

export { sql };
