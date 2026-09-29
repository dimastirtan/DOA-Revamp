import { Lucia, TimeSpan } from "lucia";
import { dev } from "$app/environment";
import { DrizzleMySQLAdapter } from "@lucia-auth/adapter-drizzle";
import { db } from "./db";
import { session } from "./db/schema";
import { mysqlTable, varchar, int, mysqlEnum } from "drizzle-orm/mysql-core";

const userTable = mysqlTable("useraccounts", {
	id: varchar("username", { length: 50 }).notNull(),
	kuid: varchar("kuid", { length: 50 }).notNull(),
	password: varchar({ length: 35 }).notNull(),
	userlevel: int().notNull(),
	provinsi: varchar("Provinsi", { length: 20 }).notNull(),
	configPenghasil: varchar("Config_penghasil", { length: 50 }).notNull(),
	activated: mysqlEnum("Activated", ['Y','N']).default('N').notNull(),
});

const adapter = new DrizzleMySQLAdapter(db, session, userTable);

export const lucia = new Lucia(adapter, {
	sessionExpiresIn: new TimeSpan(10, "h"),
	sessionCookie: {
		attributes: {
			secure: false,
		}
	},
	getUserAttributes: (attributes) => {
		return {
			id: attributes.id,
			kuid: attributes.kuid,
			// password di-expose HANYA agar hooks bisa cek "default (==NIK)".
			// hooks.server.ts MENGHAPUS field ini sebelum data sampai ke client.
			// (Username asli tak tersedia di sini — Lucia memisahkan kolom id —
			// jadi mustChangePassword dihitung di hooks tempat locals.user.id benar.)
			password: attributes.password,
			userlevel: attributes.userlevel,
			provinsi: attributes.provinsi,
			configPenghasil: attributes.configPenghasil,
			activated: attributes.activated,
			mustChangePassword: false
		};
	}
});

declare module "lucia" {
	interface Register {
		Lucia: typeof lucia;
		DatabaseUserAttributes: DatabaseUserAttributes;
	}
}

interface DatabaseUserAttributes {
	id: string;
	kuid: string;
	password: string;
	userlevel: number;
	provinsi: string;
	configPenghasil: string;
	activated: "Y" | "N";
}
