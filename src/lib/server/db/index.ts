import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema';
import 'dotenv/config';

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
	throw new Error('DATABASE_URL is not set in environment variables');
}

// Disable prefetch as it is not supported for "Transaction" pool mode (e.g. Supabase Transaction Pooler)
const client = postgres(connectionString, { prepare: false });
export const db = drizzle(client, { schema });
