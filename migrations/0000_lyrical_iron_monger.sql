CREATE TABLE "cell_log" (
	"id" serial PRIMARY KEY NOT NULL,
	"userId" text NOT NULL,
	"time" timestamp NOT NULL,
	"mcc" text,
	"mnc" text,
	"tac" text,
	"cid" text,
	"createdAt" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "user" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text,
	"email" text,
	"emailVerified" timestamp,
	"image" text,
	CONSTRAINT "user_email_unique" UNIQUE("email")
);
--> statement-breakpoint
ALTER TABLE "cell_log" ADD CONSTRAINT "cell_log_userId_user_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;