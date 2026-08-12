CREATE TABLE "checkins" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"membership_id" uuid NOT NULL,
	"visit_date" date DEFAULT CURRENT_DATE NOT NULL,
	"source" text DEFAULT 'qr' NOT NULL,
	"points_awarded" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "checkins_points_nonnegative" CHECK ("checkins"."points_awarded" >= 0)
);
--> statement-breakpoint
CREATE TABLE "coupon_campaigns" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"store_id" text NOT NULL,
	"code" text NOT NULL,
	"title" text NOT NULL,
	"description" text,
	"benefit_type" text NOT NULL,
	"benefit_value" integer,
	"minimum_order_amount" integer DEFAULT 0 NOT NULL,
	"valid_days" integer DEFAULT 14 NOT NULL,
	"per_member_limit" integer DEFAULT 1 NOT NULL,
	"starts_at" timestamp with time zone,
	"ends_at" timestamp with time zone,
	"active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "coupon_campaigns_valid_days_positive" CHECK ("coupon_campaigns"."valid_days" > 0),
	CONSTRAINT "coupon_campaigns_member_limit_positive" CHECK ("coupon_campaigns"."per_member_limit" > 0)
);
--> statement-breakpoint
CREATE TABLE "game_plays" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"store_id" text NOT NULL,
	"membership_id" uuid,
	"reward_rule_id" uuid,
	"play_date" date DEFAULT CURRENT_DATE NOT NULL,
	"reward_name_snapshot" text NOT NULL,
	"golden" boolean DEFAULT false NOT NULL,
	"claimed" boolean DEFAULT false NOT NULL,
	"claimed_at" timestamp with time zone,
	"member_coupon_id" uuid,
	"idempotency_key" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "game_reward_rules" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"store_id" text NOT NULL,
	"code" text NOT NULL,
	"name" text NOT NULL,
	"description" text NOT NULL,
	"reward_type" text NOT NULL,
	"reward_value" integer,
	"probability_basis_points" integer NOT NULL,
	"coupon_campaign_id" uuid,
	"golden" boolean DEFAULT false NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "game_reward_rules_probability_range" CHECK ("game_reward_rules"."probability_basis_points" > 0 and "game_reward_rules"."probability_basis_points" <= 10000)
);
--> statement-breakpoint
CREATE TABLE "kakao_channel_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"kakao_resource_id" text NOT NULL,
	"member_id" uuid,
	"kakao_user_id" text NOT NULL,
	"channel_public_id" text NOT NULL,
	"action" text NOT NULL,
	"payload" jsonb NOT NULL,
	"received_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "kakao_channel_events_action_check" CHECK ("kakao_channel_events"."action" in ('added', 'blocked'))
);
--> statement-breakpoint
CREATE TABLE "member_coupons" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"membership_id" uuid NOT NULL,
	"campaign_id" uuid,
	"title_snapshot" text NOT NULL,
	"description_snapshot" text,
	"status" text DEFAULT 'available' NOT NULL,
	"issued_by" text NOT NULL,
	"issued_reference_id" text,
	"issued_at" timestamp with time zone DEFAULT now() NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"redeemed_at" timestamp with time zone,
	"redemption_reference" text,
	CONSTRAINT "member_coupons_status_check" CHECK ("member_coupons"."status" in ('available', 'used', 'expired', 'cancelled'))
);
--> statement-breakpoint
CREATE TABLE "members" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"kakao_user_id" text NOT NULL,
	"nickname" text,
	"profile_image_url" text,
	"channel_friend_status" text DEFAULT 'unknown' NOT NULL,
	"marketing_consent" boolean DEFAULT false NOT NULL,
	"marketing_consented_at" timestamp with time zone,
	"last_login_at" timestamp with time zone,
	"deleted_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "members_channel_friend_status_check" CHECK ("members"."channel_friend_status" in ('unknown', 'added', 'not_added', 'blocked'))
);
--> statement-breakpoint
CREATE TABLE "point_transactions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"membership_id" uuid NOT NULL,
	"transaction_type" text NOT NULL,
	"amount" integer NOT NULL,
	"balance_after" integer NOT NULL,
	"description" text NOT NULL,
	"reference_type" text,
	"reference_id" text,
	"idempotency_key" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "point_transactions_amount_nonzero" CHECK ("point_transactions"."amount" <> 0),
	CONSTRAINT "point_transactions_balance_nonnegative" CHECK ("point_transactions"."balance_after" >= 0)
);
--> statement-breakpoint
CREATE TABLE "store_memberships" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"store_id" text NOT NULL,
	"member_id" uuid NOT NULL,
	"tier" text DEFAULT 'blue' NOT NULL,
	"points_balance" integer DEFAULT 0 NOT NULL,
	"lifetime_points" integer DEFAULT 0 NOT NULL,
	"visit_count" integer DEFAULT 0 NOT NULL,
	"last_visited_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "store_memberships_points_nonnegative" CHECK ("store_memberships"."points_balance" >= 0),
	CONSTRAINT "store_memberships_lifetime_points_nonnegative" CHECK ("store_memberships"."lifetime_points" >= 0),
	CONSTRAINT "store_memberships_visit_count_nonnegative" CHECK ("store_memberships"."visit_count" >= 0)
);
--> statement-breakpoint
CREATE TABLE "stores" (
	"id" text PRIMARY KEY NOT NULL,
	"internal_key" text NOT NULL,
	"public_code" text NOT NULL,
	"display_name" text NOT NULL,
	"branch_name" text NOT NULL,
	"kakao_channel_public_id" text,
	"address" text,
	"timezone" text DEFAULT 'Asia/Seoul' NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "checkins" ADD CONSTRAINT "checkins_membership_id_store_memberships_id_fk" FOREIGN KEY ("membership_id") REFERENCES "public"."store_memberships"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "coupon_campaigns" ADD CONSTRAINT "coupon_campaigns_store_id_stores_id_fk" FOREIGN KEY ("store_id") REFERENCES "public"."stores"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "game_plays" ADD CONSTRAINT "game_plays_store_id_stores_id_fk" FOREIGN KEY ("store_id") REFERENCES "public"."stores"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "game_plays" ADD CONSTRAINT "game_plays_membership_id_store_memberships_id_fk" FOREIGN KEY ("membership_id") REFERENCES "public"."store_memberships"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "game_plays" ADD CONSTRAINT "game_plays_reward_rule_id_game_reward_rules_id_fk" FOREIGN KEY ("reward_rule_id") REFERENCES "public"."game_reward_rules"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "game_plays" ADD CONSTRAINT "game_plays_member_coupon_id_member_coupons_id_fk" FOREIGN KEY ("member_coupon_id") REFERENCES "public"."member_coupons"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "game_reward_rules" ADD CONSTRAINT "game_reward_rules_store_id_stores_id_fk" FOREIGN KEY ("store_id") REFERENCES "public"."stores"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "game_reward_rules" ADD CONSTRAINT "game_reward_rules_coupon_campaign_id_coupon_campaigns_id_fk" FOREIGN KEY ("coupon_campaign_id") REFERENCES "public"."coupon_campaigns"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "kakao_channel_events" ADD CONSTRAINT "kakao_channel_events_member_id_members_id_fk" FOREIGN KEY ("member_id") REFERENCES "public"."members"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "member_coupons" ADD CONSTRAINT "member_coupons_membership_id_store_memberships_id_fk" FOREIGN KEY ("membership_id") REFERENCES "public"."store_memberships"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "member_coupons" ADD CONSTRAINT "member_coupons_campaign_id_coupon_campaigns_id_fk" FOREIGN KEY ("campaign_id") REFERENCES "public"."coupon_campaigns"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "point_transactions" ADD CONSTRAINT "point_transactions_membership_id_store_memberships_id_fk" FOREIGN KEY ("membership_id") REFERENCES "public"."store_memberships"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "store_memberships" ADD CONSTRAINT "store_memberships_store_id_stores_id_fk" FOREIGN KEY ("store_id") REFERENCES "public"."stores"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "store_memberships" ADD CONSTRAINT "store_memberships_member_id_members_id_fk" FOREIGN KEY ("member_id") REFERENCES "public"."members"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "checkins_membership_visit_date_uidx" ON "checkins" USING btree ("membership_id","visit_date");--> statement-breakpoint
CREATE INDEX "checkins_visit_date_idx" ON "checkins" USING btree ("visit_date");--> statement-breakpoint
CREATE UNIQUE INDEX "coupon_campaigns_store_code_uidx" ON "coupon_campaigns" USING btree ("store_id","code");--> statement-breakpoint
CREATE INDEX "coupon_campaigns_store_active_idx" ON "coupon_campaigns" USING btree ("store_id","active");--> statement-breakpoint
CREATE UNIQUE INDEX "game_plays_idempotency_uidx" ON "game_plays" USING btree ("idempotency_key");--> statement-breakpoint
CREATE UNIQUE INDEX "game_plays_daily_member_uidx" ON "game_plays" USING btree ("store_id","membership_id","play_date");--> statement-breakpoint
CREATE INDEX "game_plays_store_date_idx" ON "game_plays" USING btree ("store_id","play_date");--> statement-breakpoint
CREATE UNIQUE INDEX "game_reward_rules_store_code_uidx" ON "game_reward_rules" USING btree ("store_id","code");--> statement-breakpoint
CREATE INDEX "game_reward_rules_store_active_idx" ON "game_reward_rules" USING btree ("store_id","active");--> statement-breakpoint
CREATE UNIQUE INDEX "kakao_channel_events_resource_uidx" ON "kakao_channel_events" USING btree ("kakao_resource_id");--> statement-breakpoint
CREATE INDEX "kakao_channel_events_user_received_idx" ON "kakao_channel_events" USING btree ("kakao_user_id","received_at");--> statement-breakpoint
CREATE INDEX "member_coupons_membership_status_idx" ON "member_coupons" USING btree ("membership_id","status");--> statement-breakpoint
CREATE INDEX "member_coupons_expires_at_idx" ON "member_coupons" USING btree ("expires_at");--> statement-breakpoint
CREATE UNIQUE INDEX "members_kakao_user_id_uidx" ON "members" USING btree ("kakao_user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "point_transactions_idempotency_uidx" ON "point_transactions" USING btree ("idempotency_key");--> statement-breakpoint
CREATE INDEX "point_transactions_membership_created_idx" ON "point_transactions" USING btree ("membership_id","created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "store_memberships_store_member_uidx" ON "store_memberships" USING btree ("store_id","member_id");--> statement-breakpoint
CREATE INDEX "store_memberships_member_idx" ON "store_memberships" USING btree ("member_id");--> statement-breakpoint
CREATE UNIQUE INDEX "stores_internal_key_uidx" ON "stores" USING btree ("internal_key");--> statement-breakpoint
CREATE UNIQUE INDEX "stores_public_code_uidx" ON "stores" USING btree ("public_code");