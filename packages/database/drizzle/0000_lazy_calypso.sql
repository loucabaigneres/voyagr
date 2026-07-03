CREATE TYPE "public"."average_price" AS ENUM('budget', 'mid', 'premium');--> statement-breakpoint
CREATE TYPE "public"."document_type" AS ENUM('free_summary', 'premium_guide');--> statement-breakpoint
CREATE TYPE "public"."payment_status" AS ENUM('pending', 'completed', 'failed', 'refunded');--> statement-breakpoint
CREATE TYPE "public"."platform" AS ENUM('tiktok', 'instagram', 'other');--> statement-breakpoint
CREATE TYPE "public"."processing_status" AS ENUM('pending', 'analyzed', 'failed');--> statement-breakpoint
CREATE TYPE "public"."swipe_direction" AS ENUM('like', 'dislike');--> statement-breakpoint
CREATE TYPE "public"."trip_intensity" AS ENUM('chill', 'balanced', 'intense');--> statement-breakpoint
CREATE TYPE "public"."trip_status" AS ENUM('draft', 'finalized', 'archived');--> statement-breakpoint
CREATE TABLE "account" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"account_id" text NOT NULL,
	"provider_id" text NOT NULL,
	"access_token" text,
	"refresh_token" text,
	"accessTokenExpiresAt" timestamp (6) with time zone,
	"refreshTokenExpiresAt" timestamp (6) with time zone,
	"scope" text,
	"id_token" text,
	"password" text,
	"created_at" timestamp (6) with time zone NOT NULL,
	"updated_at" timestamp (6) with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "session" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"token" varchar(255) NOT NULL,
	"expires_at" timestamp (6) with time zone NOT NULL,
	"ip_address" text,
	"user_agent" text,
	"created_at" timestamp (6) with time zone NOT NULL,
	"updated_at" timestamp (6) with time zone NOT NULL,
	"impersonated_by" text,
	CONSTRAINT "session_token_unique" UNIQUE("token")
);
--> statement-breakpoint
CREATE TABLE "user" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"email" varchar(255) NOT NULL,
	"email_verified" boolean NOT NULL,
	"image" text,
	"created_at" timestamp (6) with time zone NOT NULL,
	"updated_at" timestamp (6) with time zone NOT NULL,
	"role" text DEFAULT 'traveler',
	"banned" boolean DEFAULT false,
	"ban_reason" text,
	"ban_expires" timestamp (6) with time zone,
	CONSTRAINT "user_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "verification" (
	"id" text PRIMARY KEY NOT NULL,
	"identifier" text NOT NULL,
	"value" text NOT NULL,
	"expires_at" timestamp (6) with time zone NOT NULL,
	"created_at" timestamp (6) with time zone NOT NULL,
	"updated_at" timestamp (6) with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "generated_document" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"trip_id" uuid NOT NULL,
	"s3_object_key" text NOT NULL,
	"version" integer DEFAULT 1,
	"doc_type" "document_type" NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "discovery_content" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"url" text NOT NULL,
	"main_media_url" text NOT NULL,
	"caroussel_urls" text[],
	"location_name" text,
	"title" text,
	"description" text,
	"country" text,
	"city" text,
	"coordinates" text,
	"tags" jsonb,
	"is_active" boolean DEFAULT true,
	CONSTRAINT "discovery_content_url_unique" UNIQUE("url")
);
--> statement-breakpoint
CREATE TABLE "imported_inspiration" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"platform" "platform" NOT NULL,
	"original_url" text NOT NULL,
	"extracted_location" text NOT NULL,
	"extracted_tags" jsonb NOT NULL,
	"status" "processing_status" NOT NULL,
	"created_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "swipe" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"discovery_context_id" uuid NOT NULL,
	"direction" "swipe_direction" NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "payment_transaction" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"trip_id" uuid,
	"stripe_session_id" text,
	"amount" integer NOT NULL,
	"currency" text DEFAULT 'EUR',
	"status" "payment_status" DEFAULT 'pending',
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "payment_transaction_stripe_session_id_unique" UNIQUE("stripe_session_id")
);
--> statement-breakpoint
CREATE TABLE "activity" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"trip_day_id" uuid NOT NULL,
	"discovery_content_id" uuid,
	"title" text NOT NULL,
	"description" text,
	"start_time" time,
	"end_time" time,
	"location_name" text,
	"coordinates" text,
	"estimated_cost" numeric,
	"order_index" integer NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "trip" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"title" text,
	"destination" text,
	"number_people" integer,
	"age" jsonb,
	"intensity" "trip_intensity",
	"average_price" "average_price",
	"start_date" date,
	"end_date" date,
	"dietary_restrictions" text,
	"medical_conditions" text,
	"interests" jsonb,
	"status" "trip_status" DEFAULT 'draft',
	"is_premium" boolean DEFAULT false,
	"confirmed" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "trip_day" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"trip_id" uuid NOT NULL,
	"day_index" integer NOT NULL,
	"target_date" date,
	"summary" text
);
--> statement-breakpoint
ALTER TABLE "account" ADD CONSTRAINT "account_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "session" ADD CONSTRAINT "session_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "generated_document" ADD CONSTRAINT "generated_document_trip_id_trip_id_fk" FOREIGN KEY ("trip_id") REFERENCES "public"."trip"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "swipe" ADD CONSTRAINT "swipe_discovery_context_id_discovery_content_id_fk" FOREIGN KEY ("discovery_context_id") REFERENCES "public"."discovery_content"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payment_transaction" ADD CONSTRAINT "payment_transaction_trip_id_trip_id_fk" FOREIGN KEY ("trip_id") REFERENCES "public"."trip"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "activity" ADD CONSTRAINT "activity_trip_day_id_trip_day_id_fk" FOREIGN KEY ("trip_day_id") REFERENCES "public"."trip_day"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "activity" ADD CONSTRAINT "activity_discovery_content_id_discovery_content_id_fk" FOREIGN KEY ("discovery_content_id") REFERENCES "public"."discovery_content"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "trip_day" ADD CONSTRAINT "trip_day_trip_id_trip_id_fk" FOREIGN KEY ("trip_id") REFERENCES "public"."trip"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "user_swipe_idx" ON "swipe" USING btree ("user_id","discovery_context_id");--> statement-breakpoint
CREATE UNIQUE INDEX "trip_day_idx" ON "trip_day" USING btree ("trip_id","day_index");