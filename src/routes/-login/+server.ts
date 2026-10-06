import { lucia } from "$lib/server/auth";
import { db } from "$lib/server/db";
import { useraccounts } from "$lib/server/db/schema";
import { eq } from "drizzle-orm";
import crypto from "crypto";
import { json } from "@sveltejs/kit";
import type { RequestHandler } from "./$types";

export const POST: RequestHandler = async ({ request, cookies }) => {
	const { username, password } = await request.json();

	if (
		typeof username !== "string" ||
		username.length < 1 ||
		typeof password !== "string" ||
		password.length < 1
	) {
		return json({ error: "Identitas yang kamu masukkan salah." }, { status: 400 });
	}

	const existingUser = await db.select().from(useraccounts).where(eq(useraccounts.username, username)).limit(1);

	if (existingUser.length === 0) {
		return json({ error: "Identitas yang kamu masukkan salah." }, { status: 400 });
	}

	const user = existingUser[0];

	// MD5 hash check
	const hashedPassword = crypto.createHash('md5').update(password).digest('hex');

	if (hashedPassword !== user.password) {
		return json({ error: "Identitas yang kamu masukkan salah." }, { status: 400 });
	}

	if (user.userlevel === 0 || user.activated === 'N') {
		return json({ error: "Akunmu belum diaktivasi oleh admin." }, { status: 400 });
	}

	const session = await lucia.createSession(user.username, {});
	const sessionCookie = lucia.createSessionCookie(session.id);
	cookies.set(sessionCookie.name, sessionCookie.value, {
		path: "/",
		...sessionCookie.attributes
	});

	return json({ success: true });
};


export const GET: RequestHandler = async ({ locals }) => {
	if (!locals.session) {
		return json({ authenticated: false }, { status: 401 });
	}
	return json({ authenticated: true });
};
