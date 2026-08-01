ALTER TABLE "admins" ADD COLUMN "totp_secret" text;--> statement-breakpoint
ALTER TABLE "admins" ADD COLUMN "totp_confirmed_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "admins" ADD COLUMN "totp_backup_codes" text[];