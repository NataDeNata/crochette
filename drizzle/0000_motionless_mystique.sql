CREATE TYPE "public"."custom_order_status" AS ENUM('new', 'quoted', 'accepted', 'in_production', 'shipped', 'completed', 'declined');--> statement-breakpoint
CREATE TYPE "public"."product_category" AS ENUM('amigurumi', 'flowers', 'home-decor', 'baskets');--> statement-breakpoint
CREATE TYPE "public"."product_status" AS ENUM('active', 'draft', 'sold_out');--> statement-breakpoint
CREATE TABLE "contact_messages" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"email" text NOT NULL,
	"subject" text,
	"message" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "custom_order_requests" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"email" text NOT NULL,
	"piece_type" text NOT NULL,
	"preferred_size" text,
	"preferred_colors" text,
	"description" text NOT NULL,
	"budget_range" text,
	"status" "custom_order_status" DEFAULT 'new' NOT NULL,
	"quoted_price_cents" integer,
	"admin_notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "products" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"slug" text NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"price_cents" integer NOT NULL,
	"category" "product_category" NOT NULL,
	"tag" text,
	"status" "product_status" DEFAULT 'active' NOT NULL,
	"stock_qty" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "products_slug_unique" UNIQUE("slug")
);
