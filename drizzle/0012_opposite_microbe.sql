ALTER TABLE "admins" ADD COLUMN "password_changed_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "customers" ADD COLUMN "password_changed_at" timestamp with time zone;