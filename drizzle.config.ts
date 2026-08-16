import { defineConfig } from 'drizzle-kit';
import 'dotenv/config';

let databaseUrl = process.env.DATABASE_URL || process.env.DATABASE_URL;
if (!databaseUrl) {
	throw new Error('DATABASE_URL is not set in environment variables');
}

// Preserve connection string adjustments for Supabase local dev container environments
if (databaseUrl.includes('postgres:postgres@supabase_db_')) {
	const url = new URL(databaseUrl);
	url.hostname = url.hostname.split('_')[1];
	databaseUrl = url.href;
}

export default defineConfig({
	schema: './src/lib/server/db/schema.ts',
	out: './drizzle',
	dialect: 'postgresql',
	dbCredentials: {
		url: databaseUrl
	}
});
