CREATE TABLE `registers` (
	`email` varchar(100) NOT NULL,
	`nama` varchar(100) NOT NULL,
	`nik` varchar(100) NOT NULL,
	`org` varchar(50) NOT NULL,
	`org_lokasi` varchar(50) NOT NULL,
	`mgr_email` varchar(100) NOT NULL,
	`mgr_nama` varchar(100) NOT NULL,
	`mgr_nik` varchar(100) NOT NULL,
	CONSTRAINT `registers_nik` PRIMARY KEY(`nik`)
);
--> statement-breakpoint
CREATE TABLE `session` (
	`id` varchar(255) NOT NULL,
	`user_id` varchar(50) NOT NULL,
	`expires_at` datetime NOT NULL,
	CONSTRAINT `session_id` PRIMARY KEY(`id`)
);
