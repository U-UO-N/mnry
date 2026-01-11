import mysql, { Pool, PoolOptions, RowDataPacket, ResultSetHeader } from 'mysql2/promise';
import { config } from '../config';
import { logger } from '../utils/logger';

const poolConfig: PoolOptions = {
  host: config.mysql.host,
  port: config.mysql.port,
  user: config.mysql.user,
  password: config.mysql.password,
  database: config.mysql.database,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  enableKeepAlive: true,
  keepAliveInitialDelay: 0,
};

let pool: Pool | null = null;

export const getPool = (): Pool => {
  if (!pool) {
    pool = mysql.createPool(poolConfig);
    logger.info('MySQL connection pool created');
  }
  return pool;
};

export const query = async <T extends RowDataPacket[]>(
  sql: string,
  params?: unknown[]
): Promise<T> => {
  const connection = getPool();
  const [rows] = await connection.query<T>(sql, params);
  return rows;
};

export const execute = async (sql: string, params?: unknown[]): Promise<ResultSetHeader> => {
  const connection = getPool();
  const [result] = await connection.execute<ResultSetHeader>(sql, params);
  return result;
};

export const closePool = async (): Promise<void> => {
  if (pool) {
    await pool.end();
    pool = null;
    logger.info('MySQL connection pool closed');
  }
};

export const testConnection = async (): Promise<boolean> => {
  try {
    const connection = getPool();
    await connection.query('SELECT 1');
    logger.info('MySQL connection test successful');
    return true;
  } catch (error) {
    logger.error('MySQL connection test failed', error);
    return false;
  }
};
