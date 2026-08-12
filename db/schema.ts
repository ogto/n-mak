import { sql } from "drizzle-orm";
import {
  boolean,
  check,
  date,
  index,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

const timestamps = {
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
};

export const stores = pgTable(
  "stores",
  {
    id: text("id").primaryKey(),
    internalKey: text("internal_key").notNull(),
    publicCode: text("public_code").notNull(),
    displayName: text("display_name").notNull(),
    branchName: text("branch_name").notNull(),
    kakaoChannelPublicId: text("kakao_channel_public_id"),
    address: text("address"),
    timezone: text("timezone").default("Asia/Seoul").notNull(),
    active: boolean("active").default(true).notNull(),
    ...timestamps,
  },
  (table) => [
    uniqueIndex("stores_internal_key_uidx").on(table.internalKey),
    uniqueIndex("stores_public_code_uidx").on(table.publicCode),
  ],
);

export const members = pgTable(
  "members",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    kakaoUserId: text("kakao_user_id").notNull(),
    nickname: text("nickname"),
    profileImageUrl: text("profile_image_url"),
    channelFriendStatus: text("channel_friend_status").default("unknown").notNull(),
    marketingConsent: boolean("marketing_consent").default(false).notNull(),
    marketingConsentedAt: timestamp("marketing_consented_at", { withTimezone: true }),
    lastLoginAt: timestamp("last_login_at", { withTimezone: true }),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
    ...timestamps,
  },
  (table) => [
    uniqueIndex("members_kakao_user_id_uidx").on(table.kakaoUserId),
    check(
      "members_channel_friend_status_check",
      sql`${table.channelFriendStatus} in ('unknown', 'added', 'not_added', 'blocked')`,
    ),
  ],
);

export const storeMemberships = pgTable(
  "store_memberships",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    storeId: text("store_id").notNull().references(() => stores.id, { onDelete: "cascade" }),
    memberId: uuid("member_id").notNull().references(() => members.id, { onDelete: "cascade" }),
    tier: text("tier").default("blue").notNull(),
    pointsBalance: integer("points_balance").default(0).notNull(),
    lifetimePoints: integer("lifetime_points").default(0).notNull(),
    visitCount: integer("visit_count").default(0).notNull(),
    lastVisitedAt: timestamp("last_visited_at", { withTimezone: true }),
    ...timestamps,
  },
  (table) => [
    uniqueIndex("store_memberships_store_member_uidx").on(table.storeId, table.memberId),
    index("store_memberships_member_idx").on(table.memberId),
    check("store_memberships_points_nonnegative", sql`${table.pointsBalance} >= 0`),
    check("store_memberships_lifetime_points_nonnegative", sql`${table.lifetimePoints} >= 0`),
    check("store_memberships_visit_count_nonnegative", sql`${table.visitCount} >= 0`),
  ],
);

export const checkins = pgTable(
  "checkins",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    membershipId: uuid("membership_id").notNull().references(() => storeMemberships.id, { onDelete: "cascade" }),
    visitDate: date("visit_date", { mode: "string" }).default(sql`CURRENT_DATE`).notNull(),
    source: text("source").default("qr").notNull(),
    pointsAwarded: integer("points_awarded").default(0).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex("checkins_membership_visit_date_uidx").on(table.membershipId, table.visitDate),
    index("checkins_visit_date_idx").on(table.visitDate),
    check("checkins_points_nonnegative", sql`${table.pointsAwarded} >= 0`),
  ],
);

export const pointTransactions = pgTable(
  "point_transactions",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    membershipId: uuid("membership_id").notNull().references(() => storeMemberships.id, { onDelete: "cascade" }),
    transactionType: text("transaction_type").notNull(),
    amount: integer("amount").notNull(),
    balanceAfter: integer("balance_after").notNull(),
    description: text("description").notNull(),
    referenceType: text("reference_type"),
    referenceId: text("reference_id"),
    idempotencyKey: text("idempotency_key").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex("point_transactions_idempotency_uidx").on(table.idempotencyKey),
    index("point_transactions_membership_created_idx").on(table.membershipId, table.createdAt),
    check("point_transactions_amount_nonzero", sql`${table.amount} <> 0`),
    check("point_transactions_balance_nonnegative", sql`${table.balanceAfter} >= 0`),
  ],
);

export const couponCampaigns = pgTable(
  "coupon_campaigns",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    storeId: text("store_id").notNull().references(() => stores.id, { onDelete: "cascade" }),
    code: text("code").notNull(),
    title: text("title").notNull(),
    description: text("description"),
    benefitType: text("benefit_type").notNull(),
    benefitValue: integer("benefit_value"),
    minimumOrderAmount: integer("minimum_order_amount").default(0).notNull(),
    validDays: integer("valid_days").default(14).notNull(),
    perMemberLimit: integer("per_member_limit").default(1).notNull(),
    startsAt: timestamp("starts_at", { withTimezone: true }),
    endsAt: timestamp("ends_at", { withTimezone: true }),
    active: boolean("active").default(true).notNull(),
    ...timestamps,
  },
  (table) => [
    uniqueIndex("coupon_campaigns_store_code_uidx").on(table.storeId, table.code),
    index("coupon_campaigns_store_active_idx").on(table.storeId, table.active),
    check("coupon_campaigns_valid_days_positive", sql`${table.validDays} > 0`),
    check("coupon_campaigns_member_limit_positive", sql`${table.perMemberLimit} > 0`),
  ],
);

export const memberCoupons = pgTable(
  "member_coupons",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    membershipId: uuid("membership_id").notNull().references(() => storeMemberships.id, { onDelete: "cascade" }),
    campaignId: uuid("campaign_id").references(() => couponCampaigns.id, { onDelete: "set null" }),
    titleSnapshot: text("title_snapshot").notNull(),
    descriptionSnapshot: text("description_snapshot"),
    status: text("status").default("available").notNull(),
    issuedBy: text("issued_by").notNull(),
    issuedReferenceId: text("issued_reference_id"),
    issuedAt: timestamp("issued_at", { withTimezone: true }).defaultNow().notNull(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    redeemedAt: timestamp("redeemed_at", { withTimezone: true }),
    redemptionReference: text("redemption_reference"),
  },
  (table) => [
    index("member_coupons_membership_status_idx").on(table.membershipId, table.status),
    index("member_coupons_expires_at_idx").on(table.expiresAt),
    check(
      "member_coupons_status_check",
      sql`${table.status} in ('available', 'used', 'expired', 'cancelled')`,
    ),
  ],
);

export const gameRewardRules = pgTable(
  "game_reward_rules",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    storeId: text("store_id").notNull().references(() => stores.id, { onDelete: "cascade" }),
    code: text("code").notNull(),
    name: text("name").notNull(),
    description: text("description").notNull(),
    rewardType: text("reward_type").notNull(),
    rewardValue: integer("reward_value"),
    probabilityBasisPoints: integer("probability_basis_points").notNull(),
    couponCampaignId: uuid("coupon_campaign_id").references(() => couponCampaigns.id, { onDelete: "set null" }),
    golden: boolean("golden").default(false).notNull(),
    active: boolean("active").default(true).notNull(),
    ...timestamps,
  },
  (table) => [
    uniqueIndex("game_reward_rules_store_code_uidx").on(table.storeId, table.code),
    index("game_reward_rules_store_active_idx").on(table.storeId, table.active),
    check(
      "game_reward_rules_probability_range",
      sql`${table.probabilityBasisPoints} > 0 and ${table.probabilityBasisPoints} <= 10000`,
    ),
  ],
);

export const gamePlays = pgTable(
  "game_plays",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    storeId: text("store_id").notNull().references(() => stores.id, { onDelete: "cascade" }),
    membershipId: uuid("membership_id").references(() => storeMemberships.id, { onDelete: "set null" }),
    rewardRuleId: uuid("reward_rule_id").references(() => gameRewardRules.id, { onDelete: "set null" }),
    playDate: date("play_date", { mode: "string" }).default(sql`CURRENT_DATE`).notNull(),
    rewardNameSnapshot: text("reward_name_snapshot").notNull(),
    golden: boolean("golden").default(false).notNull(),
    claimed: boolean("claimed").default(false).notNull(),
    claimedAt: timestamp("claimed_at", { withTimezone: true }),
    memberCouponId: uuid("member_coupon_id").references(() => memberCoupons.id, { onDelete: "set null" }),
    idempotencyKey: text("idempotency_key").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex("game_plays_idempotency_uidx").on(table.idempotencyKey),
    uniqueIndex("game_plays_daily_member_uidx").on(table.storeId, table.membershipId, table.playDate),
    index("game_plays_store_date_idx").on(table.storeId, table.playDate),
  ],
);

export const kakaoChannelEvents = pgTable(
  "kakao_channel_events",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    kakaoResourceId: text("kakao_resource_id").notNull(),
    memberId: uuid("member_id").references(() => members.id, { onDelete: "set null" }),
    kakaoUserId: text("kakao_user_id").notNull(),
    channelPublicId: text("channel_public_id").notNull(),
    action: text("action").notNull(),
    payload: jsonb("payload").$type<Record<string, unknown>>().notNull(),
    receivedAt: timestamp("received_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex("kakao_channel_events_resource_uidx").on(table.kakaoResourceId),
    index("kakao_channel_events_user_received_idx").on(table.kakaoUserId, table.receivedAt),
    check("kakao_channel_events_action_check", sql`${table.action} in ('added', 'blocked')`),
  ],
);
