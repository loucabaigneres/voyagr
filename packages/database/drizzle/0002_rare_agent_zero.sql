ALTER TABLE "swipe" RENAME COLUMN "discovery_context_id" TO "discovery_content_id";--> statement-breakpoint
ALTER TABLE "swipe" DROP CONSTRAINT "swipe_discovery_context_id_discovery_content_id_fk";
--> statement-breakpoint
DROP INDEX "user_swipe_idx";--> statement-breakpoint
ALTER TABLE "swipe" ADD CONSTRAINT "swipe_discovery_content_id_discovery_content_id_fk" FOREIGN KEY ("discovery_content_id") REFERENCES "public"."discovery_content"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "user_swipe_idx" ON "swipe" USING btree ("user_id","discovery_content_id");