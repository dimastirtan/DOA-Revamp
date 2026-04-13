import { defineConfig } from 'drizzle-kit';

export default defineConfig({
	schema: './src/lib/server/db/schema.ts',
	out: './src/lib/server/db',
	dialect: 'mysql',
	verbose: true,
	strict: true,
	dbCredentials: {
		host: 'localhost',
		port: 3306,
		user: 'root',
		database: 'standard'
		// host: '127.0.0.1',
		// port: 3307,
		// user: 'root',
		// password: 'pass',
		// database: 'standard'
	}
});
