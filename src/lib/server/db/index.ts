import { createPool } from 'mysql2/promise';
import { drizzle } from 'drizzle-orm/mysql2';
import * as schema from './schema';
// Koneksi DB dibaca dari ENVIRONMENT saat RUNTIME. Ganti server (mis. cutover ke
// 100.64.0.3 saat migrasi) cukup ubah DB_* di .env lalu RESTART `node --env-file=.env build`
// — TANPA build ulang. Default (setelah '??') = DB LOKAL, default aman untuk dev.
import { env } from '$env/dynamic/private';

export const db = drizzle(
	createPool({
		host: env.DB_HOST ?? '127.0.0.1',
		port: Number(env.DB_PORT ?? 3306),
		user: env.DB_USER ?? 'root',
		password: env.DB_PASS ?? '',
		database: env.DB_NAME ?? 'doan',

	}),
	{ schema, mode: 'default' }
);
