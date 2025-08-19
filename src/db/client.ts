import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema';

const connectionString = import.meta.env.VITE_SUPABASE_DB_URL;

if (!connectionString) {
  throw new Error('VITE_SUPABASE_DB_URL is not set');
}

// Configuração do cliente postgres
const client = postgres(connectionString, {
  prepare: false,
  max: 10,
});

// Cliente Drizzle
export const db = drizzle(client, { schema });

export type DB = typeof db;