import sql from 'mssql';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const config: sql.config = {
  server: process.env.SQL_SERVER || '172.1.10.43',
  database: process.env.SQL_DATABASE || 'IndigoBuilders',
  user: process.env.SQL_USER || 'sa',
  password: process.env.SQL_PASSWORD || '',
  options: {
    encrypt: process.env.SQL_ENCRYPT === 'true',
    trustServerCertificate: process.env.SQL_TRUST_SERVER_CERTIFICATE !== 'false',
  },
  pool: { max: 10, min: 0, idleTimeoutMillis: 30000 },
};

let pool: sql.ConnectionPool | null = null;

export async function getPool(): Promise<sql.ConnectionPool> {
  if (!pool) {
    pool = await sql.connect(config);
    console.log('✅ DB connected:', config.database);
  }
  return pool;
}

/** Run a SELECT/DML query with named @param placeholders */
export async function runQuery<T = Record<string, unknown>>(
  query: string,
  params?: Record<string, unknown>
): Promise<T[]> {
  const db = await getPool();
  const request = db.request();
  if (params) {
    for (const [key, value] of Object.entries(params)) {
      request.input(key, value);
    }
  }
  const result = await request.query(query);
  return result.recordset as T[];
}

/** Same as runQuery but also returns rowsAffected */
export async function runQueryResult<T = Record<string, unknown>>(
  query: string,
  params?: Record<string, unknown>
): Promise<{ recordset: T[]; rowsAffected: number[] }> {
  const db = await getPool();
  const request = db.request();
  if (params) {
    for (const [key, value] of Object.entries(params)) {
      request.input(key, value);
    }
  }
  const result = await request.query(query);
  return { recordset: result.recordset as T[], rowsAffected: result.rowsAffected };
}

export { sql };
