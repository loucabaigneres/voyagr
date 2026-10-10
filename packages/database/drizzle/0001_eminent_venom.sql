CREATE TABLE "user_onboarding" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"trip_id" uuid NOT NULL,
	"user_id" text,
	"landscapes" text[] DEFAULT '{}' NOT NULL,
	"vibes" text[] DEFAULT '{}' NOT NULL,
	"travel_with" text[] DEFAULT '{}' NOT NULL,
	"climates" text[] DEFAULT '{}' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "imported_inspiration" ADD COLUMN "description" text;--> statement-breakpoint
ALTER TABLE "user_onboarding" ADD CONSTRAINT "user_onboarding_trip_id_trip_id_fk" FOREIGN KEY ("trip_id") REFERENCES "public"."trip"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_onboarding" ADD CONSTRAINT "user_onboarding_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;