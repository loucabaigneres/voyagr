CREATE TABLE "inspiration_group" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"name" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "inspiration_group_member" (
	"inspiration_id" uuid NOT NULL,
	"group_id" uuid NOT NULL,
	CONSTRAINT "inspiration_group_member_inspiration_id_group_id_pk" PRIMARY KEY("inspiration_id","group_id")
);
--> statement-breakpoint
ALTER TABLE "discovery_content" ADD COLUMN "owner_user_id" text;--> statement-breakpoint
ALTER TABLE "imported_inspiration" ADD COLUMN "report" text;--> statement-breakpoint
ALTER TABLE "imported_inspiration" ADD COLUMN "places" jsonb;--> statement-breakpoint
ALTER TABLE "inspiration_group_member" ADD CONSTRAINT "inspiration_group_member_inspiration_id_imported_inspiration_id_fk" FOREIGN KEY ("inspiration_id") REFERENCES "public"."imported_inspiration"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inspiration_group_member" ADD CONSTRAINT "inspiration_group_member_group_id_inspiration_group_id_fk" FOREIGN KEY ("group_id") REFERENCES "public"."inspiration_group"("id") ON DELETE cascade ON UPDATE no action;