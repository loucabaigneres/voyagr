DROP TABLE "inspiration_group" CASCADE;--> statement-breakpoint
DROP TABLE "inspiration_group_member" CASCADE;--> statement-breakpoint
ALTER TABLE "imported_inspiration" ADD COLUMN "type" text;--> statement-breakpoint
ALTER TABLE "imported_inspiration" ADD COLUMN "city" text;