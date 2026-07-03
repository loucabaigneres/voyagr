ALTER TABLE "trip" RENAME COLUMN "age" TO "ages";--> statement-breakpoint
ALTER TABLE "session" ADD COLUMN "impersonated_by" text;--> statement-breakpoint
ALTER TABLE "trip" ADD COLUMN "duration_days" integer;--> statement-breakpoint
ALTER TABLE "trip" DROP COLUMN "end_date";