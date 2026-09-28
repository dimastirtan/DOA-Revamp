import { mysqlTable, primaryKey, index, int, varchar, date, text, mysqlEnum, tinyint, datetime } from "drizzle-orm/mysql-core"

export const form = mysqlTable("form", {
	no: int().autoincrement().notNull(),
	type: varchar({ length: 10 }).notNull(),
	nmpath: varchar({ length: 50 }),
	number: varchar({ length: 30 }),
	pdf: varchar({ length: 40 }),
	revision: varchar({ length: 2 }),
	// you can use { mode: 'date' }, if you want to have Date as type for this column
	date: date({ mode: 'string' }),
	title: varchar({ length: 500 }),
	category: varchar({ length: 25 }),
	controlSheet: varchar("control_sheet", { length: 25 }),
	remark: varchar({ length: 50 }),
},
(table) => [
	primaryKey({ columns: [table.no], name: "form_no"}),
]);

export const history = mysqlTable("history", {
	no: int().autoincrement().notNull(),
	judul: varchar("Judul", { length: 100 }),
	username: varchar({ length: 30 }),
	nama: varchar({ length: 40 }),
	nmdoc: varchar({ length: 50 }),
	tanggal: varchar("Tanggal", { length: 20 }),
	remark: varchar({ length: 50 }),
},
(table) => [
	primaryKey({ columns: [table.no], name: "history_no"}),
]);

export const standard = mysqlTable("standard", {
	no: int().autoincrement().notNull(),
	type: varchar({ length: 10 }).notNull(),
	nmpath: varchar({ length: 100 }),
	number: varchar({ length: 100 }),
	pdf: varchar({ length: 100 }),
	revision: varchar({ length: 10 }),
	// you can use { mode: 'date' }, if you want to have Date as type for this column
	date: date({ mode: 'string' }),
	// you can use { mode: 'date' }, if you want to have Date as type for this column
	date2: date({ mode: 'string' }).notNull(),
	title: varchar({ length: 500 }),
	category: varchar({ length: 25 }),
	controlSheet: varchar("control_sheet", { length: 25 }),
	remark: varchar({ length: 50 }),
	panel: text().notNull(),
	nik: text().notNull(),
	nama: text().notNull(),
},
(table) => [
	primaryKey({ columns: [table.no], name: "standard_no"}),
]);

export const standard091224 = mysqlTable("standard091224", {
	no: int().autoincrement().notNull(),
	type: varchar({ length: 10 }).notNull(),
	nmpath: varchar({ length: 100 }),
	number: varchar({ length: 100 }),
	pdf: varchar({ length: 100 }),
	revision: varchar({ length: 10 }),
	// you can use { mode: 'date' }, if you want to have Date as type for this column
	date: date({ mode: 'string' }),
	// you can use { mode: 'date' }, if you want to have Date as type for this column
	date2: date({ mode: 'string' }).notNull(),
	title: varchar({ length: 500 }),
	category: varchar({ length: 25 }),
	controlSheet: varchar("control_sheet", { length: 25 }),
	remark: varchar({ length: 50 }),
	panel: text().notNull(),
	nik: text().notNull(),
	nama: text().notNull(),
},
(table) => [
	primaryKey({ columns: [table.no], name: "standard091224_no"}),
]);

export const standard150425 = mysqlTable("standard150425", {
	no: int().autoincrement().notNull(),
	type: varchar({ length: 10 }).notNull(),
	nmpath: varchar({ length: 100 }),
	number: varchar({ length: 100 }),
	pdf: varchar({ length: 100 }),
	revision: varchar({ length: 10 }),
	// you can use { mode: 'date' }, if you want to have Date as type for this column
	date: date({ mode: 'string' }),
	// you can use { mode: 'date' }, if you want to have Date as type for this column
	date2: date({ mode: 'string' }).notNull(),
	title: varchar({ length: 500 }),
	category: varchar({ length: 25 }),
	controlSheet: varchar("control_sheet", { length: 25 }),
	remark: varchar({ length: 50 }),
	panel: text().notNull(),
	nik: text().notNull(),
	nama: text().notNull(),
},
(table) => [
	primaryKey({ columns: [table.no], name: "standard150425_no"}),
]);

export const standard210425 = mysqlTable("standard210425", {
	no: int().autoincrement().notNull(),
	type: varchar({ length: 10 }).notNull(),
	nmpath: varchar({ length: 100 }),
	number: varchar({ length: 100 }),
	pdf: varchar({ length: 100 }),
	revision: varchar({ length: 10 }),
	// you can use { mode: 'date' }, if you want to have Date as type for this column
	date: date({ mode: 'string' }),
	// you can use { mode: 'date' }, if you want to have Date as type for this column
	date2: date({ mode: 'string' }).notNull(),
	title: varchar({ length: 500 }),
	category: varchar({ length: 25 }),
	controlSheet: varchar("control_sheet", { length: 25 }),
	remark: varchar({ length: 50 }),
	panel: text().notNull(),
	nik: text().notNull(),
	nama: text().notNull(),
},
(table) => [
	primaryKey({ columns: [table.no], name: "standard210425_no"}),
]);

export const standard061125 = mysqlTable("standard_061125", {
	no: int().autoincrement().notNull(),
	type: varchar({ length: 10 }).notNull(),
	nmpath: varchar({ length: 100 }),
	number: varchar({ length: 100 }),
	pdf: varchar({ length: 100 }),
	revision: varchar({ length: 10 }),
	// you can use { mode: 'date' }, if you want to have Date as type for this column
	date: date({ mode: 'string' }),
	// you can use { mode: 'date' }, if you want to have Date as type for this column
	date2: date({ mode: 'string' }).notNull(),
	title: varchar({ length: 500 }),
	category: varchar({ length: 25 }),
	controlSheet: varchar("control_sheet", { length: 25 }),
	remark: varchar({ length: 50 }),
	panel: text().notNull(),
	nik: text().notNull(),
	nama: text().notNull(),
},
(table) => [
	primaryKey({ columns: [table.no], name: "standard_061125_no"}),
]);

export const standardbu = mysqlTable("standardbu", {
	no: int().autoincrement().notNull(),
	type: varchar({ length: 10 }).notNull(),
	nmpath: varchar({ length: 100 }),
	number: varchar({ length: 100 }),
	pdf: varchar({ length: 100 }),
	revision: varchar({ length: 10 }),
	// you can use { mode: 'date' }, if you want to have Date as type for this column
	date: date({ mode: 'string' }),
	// you can use { mode: 'date' }, if you want to have Date as type for this column
	date2: date({ mode: 'string' }).notNull(),
	title: varchar({ length: 500 }),
	category: varchar({ length: 25 }),
	controlSheet: varchar("control_sheet", { length: 25 }),
	remark: varchar({ length: 50 }),
	panel: text().notNull(),
	nik: text().notNull(),
	nama: text().notNull(),
},
(table) => [
	primaryKey({ columns: [table.no], name: "standardbu_no"}),
]);

export const useraccounts = mysqlTable("useraccounts", {
	username: varchar("username", { length: 50 }).notNull(),
	kuid: varchar("kuid", { length: 32 }).notNull(),
	password: varchar("password", { length: 35 }).notNull(),
	userlevel: int("userlevel").notNull(),
	provinsi: varchar("Provinsi", { length: 20 }).notNull(),
	configPenghasil: varchar("Config_penghasil", { length: 50 }).notNull(),
	activated: mysqlEnum("Activated", ['Y','N']).default('N').notNull(),
	// Akumulasi poin quiz (cache — sumber kebenaran: SUM(quiz_attempt.points)).
	// Kolom ini ditambahkan quiz.sql; jalankan SQL itu sebelum deploy build baru.
	points: int("points").default(0).notNull(),
	// Kode departemen (C_ORG) hasil backfill dari dittek.tmemp (docs/quiz_design.md).
	// Disimpan penuh (mis. SE1000 ≠ SE2000 ≠ SE1300). NULL = NIK tidak ada di tmemp.
	org: varchar("org", { length: 20 }),
},
(table) => [
	primaryKey({ columns: [table.username], name: "useraccounts_username"}),
]);

export const useraccounts170325 = mysqlTable("useraccounts170325", {
	username: varchar("username", { length: 50 }).notNull(),
	kuid: varchar("kuid", { length: 32 }).notNull(),
	password: varchar("password", { length: 35 }).notNull(),
	userlevel: int("userlevel").notNull(),
	provinsi: varchar("Provinsi", { length: 20 }).notNull(),
	configPenghasil: varchar("Config_penghasil", { length: 50 }).notNull(),
	activated: mysqlEnum("Activated", ['Y','N']).default('N').notNull(),
},
(table) => [
	primaryKey({ columns: [table.username], name: "useraccounts170325_username"}),
]);

export const users = mysqlTable("users", {
	username: varchar({ length: 30 }).notNull(),
	password: varchar({ length: 32 }),
	userid: varchar({ length: 32 }),
	userlevel: tinyint({ unsigned: true }).notNull(),
	email: varchar({ length: 50 }),
	timestamp: int({ unsigned: true }).notNull(),
	parentDirectory: varchar("parent_directory", { length: 30 }).notNull(),
},
(table) => [
	primaryKey({ columns: [table.username], name: "users_username"}),
]);

export const session = mysqlTable("session", {
	id: varchar({ length: 255 }).notNull(),
	userId: varchar("user_id", { length: 50 }).notNull(),
	expiresAt: datetime("expires_at", { mode: "date" }).notNull(),
},
(table) => [
	primaryKey({ columns: [table.id], name: "session_id"}),
]);

// ── Quiz pemahaman prosedur (docs/quiz_design.md) ─────────────────────────
// Soal = atribut procedure. KUNCI = standardNo (standard.no, PK PERMANEN),
// BUKAN nomor dokumen — supaya soal tidak hilang saat nomor procedure diubah.
// nmdoc hanya snapshot informatif. Soft-delete via remark='D'.
export const quizQuestion = mysqlTable("quiz_question", {
	no: int("no").autoincrement().notNull(),
	standardNo: int("standard_no").notNull(),
	nmdoc: varchar("nmdoc", { length: 100 }),
	question: text("question").notNull(),
	optionA: varchar("option_a", { length: 500 }).notNull(),
	optionB: varchar("option_b", { length: 500 }).notNull(),
	optionC: varchar("option_c", { length: 500 }).notNull(),
	optionD: varchar("option_d", { length: 500 }).notNull(),
	correct: mysqlEnum("correct", ['A', 'B', 'C', 'D']).notNull(),
	remark: varchar("remark", { length: 50 }).default('Active').notNull(),
	updatedBy: varchar("updated_by", { length: 50 }),
	updatedAt: datetime("updated_at", { mode: "date" }),
},
(table) => [
	primaryKey({ columns: [table.no], name: "quiz_question_no" }),
	index("idx_qq_standard").on(table.standardNo),
]);

// Attempt = sekaligus log/history quiz. nmdoc/title/revision = SNAPSHOT BEKU
// (log tetap menampilkan nomor lama walau dokumen di-rename/dihapus).
// standardNo dipakai internal untuk mengambil soal saat penilaian.
// points = poin yang dikreditkan attempt ini (aturan nilai tertinggi).
export const quizAttempt = mysqlTable("quiz_attempt", {
	no: int("no").autoincrement().notNull(),
	username: varchar("username", { length: 50 }).notNull(),
	nama: varchar("nama", { length: 50 }),
	standardNo: int("standard_no").notNull(),
	nmdoc: varchar("nmdoc", { length: 100 }).notNull(),
	title: varchar("title", { length: 500 }),
	revision: varchar("revision", { length: 10 }),
	score: int("score").default(0).notNull(),
	status: mysqlEnum("status", ['pending', 'lulus', 'gagal']).default('pending').notNull(),
	points: int("points").default(0).notNull(),
	startedAt: datetime("started_at", { mode: "date" }).notNull(),
	finishedAt: datetime("finished_at", { mode: "date" }),
},
(table) => [
	primaryKey({ columns: [table.no], name: "quiz_attempt_no" }),
	index("idx_qa_user").on(table.username),
	index("idx_qa_standard").on(table.standardNo),
]);

export const registers = mysqlTable("registers", {
	email: varchar({ length: 100 }).notNull(),
	nama: varchar({ length: 100 }).notNull(),
	nik: varchar({ length: 100 }).notNull(),
	org: varchar({ length: 50 }).notNull(),
	orgLokasi: varchar("org_lokasi", { length: 50 }).notNull(),
	mgrEmail: varchar("mgr_email", { length: 100 }).notNull(),
	mgrNama: varchar("mgr_nama", { length: 100 }).notNull(),
	mgrNik: varchar("mgr_nik", { length: 100 }).notNull(),
},
(table) => [
	primaryKey({ columns: [table.nik], name: "registers_nik" }),
]);
