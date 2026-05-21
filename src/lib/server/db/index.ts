// import { drizzle } from 'drizzle-orm/mysql2';
// import mysql from 'mysql2/promise';
// import * as schema from './schema';
// import { env } from '$env/dynamic/private';

// if (!env.DATABASE_URL) throw new Error('DATABASE_URL is not set');

// const client = mysql.createPool(env.DATABASE_URL);

// export const db = drizzle(client, { schema, mode: 'default' });

import { createPool } from 'mysql2/promise';
import { drizzle } from 'drizzle-orm/mysql2';
import * as schema from './schema';

export const db = drizzle(
	createPool({
		// host: '10.1.95.76',
		// port: 3306,
		// user: 'doa-revamp',
		// password: 'ab8382bt',
		// database: 'standard',

		host: '127.0.0.1',
		port: 3306,
		user: 'root',
		password: '',
		database: 'doan'
	}),
	{ schema, mode: 'default' }
);
