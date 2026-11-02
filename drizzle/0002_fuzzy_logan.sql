CREATE TABLE "levels" (
	"id" serial PRIMARY KEY NOT NULL,
	"task_id" integer NOT NULL,
	"content" text[] NOT NULL,
	"cinematica" text[] NOT NULL,
	"vista" text[] NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "tasks" (
	"id" serial PRIMARY KEY NOT NULL,
	"title" text NOT NULL,
	"description" text,
	"tema" text NOT NULL,
	"cantidad_de_niveles" integer NOT NULL,
	"ilustracion" text,
	"status" text DEFAULT '0' NOT NULL,
	"is_archived" boolean DEFAULT false NOT NULL,
	"user_id" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "aliado" text;--> statement-breakpoint
ALTER TABLE "levels" ADD CONSTRAINT "levels_task_id_tasks_id_fk" FOREIGN KEY ("task_id") REFERENCES "public"."tasks"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "tasks_user_id_idx" ON "tasks" USING btree ("user_id");