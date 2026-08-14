import { and, desc, eq } from "drizzle-orm";
import { getDb } from "../db";
import {
  checkins,
  gamePlays,
  gameRewardRules,
  memberCoupons,
  pointTransactions,
  storeMemberships,
} from "../db/schema";

export type MembershipCouponView = {
  id: string;
  title: string;
  description: string | null;
  status: "available" | "used" | "expired" | "cancelled";
  issuedAt: string;
  expiresAt: string;
};

export type PointTransactionView = {
  id: string;
  amount: number;
  balanceAfter: number;
  description: string;
  createdAt: string;
};

export type MembershipDetailView = {
  membershipId: string;
  pointsBalance: number;
  lifetimePoints: number;
  visitCount: number;
  checkedInToday: boolean;
  checkinDates: string[];
  coupons: MembershipCouponView[];
  pointTransactions: PointTransactionView[];
};

export type TodayGamePlayView = {
  id: string;
  name: string;
  description: string;
  rewardType: "coupon" | "points";
  rewardValue: number | null;
  golden: boolean;
};

function seoulDateKey(date = new Date()) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

export async function getMembershipDetails(
  storeId: string,
  memberId: string,
): Promise<MembershipDetailView | null> {
  const db = getDb();
  const [membership] = await db
    .select({
      id: storeMemberships.id,
      pointsBalance: storeMemberships.pointsBalance,
      lifetimePoints: storeMemberships.lifetimePoints,
      visitCount: storeMemberships.visitCount,
    })
    .from(storeMemberships)
    .where(
      and(
        eq(storeMemberships.storeId, storeId),
        eq(storeMemberships.memberId, memberId),
      ),
    )
    .limit(1);

  if (!membership) return null;

  const [checkinRows, couponRows, transactionRows] = await Promise.all([
    db
      .select({ visitDate: checkins.visitDate })
      .from(checkins)
      .where(eq(checkins.membershipId, membership.id))
      .orderBy(desc(checkins.visitDate))
      .limit(31),
    db
      .select({
        id: memberCoupons.id,
        title: memberCoupons.titleSnapshot,
        description: memberCoupons.descriptionSnapshot,
        status: memberCoupons.status,
        issuedAt: memberCoupons.issuedAt,
        expiresAt: memberCoupons.expiresAt,
      })
      .from(memberCoupons)
      .where(eq(memberCoupons.membershipId, membership.id))
      .orderBy(desc(memberCoupons.issuedAt))
      .limit(50),
    db
      .select({
        id: pointTransactions.id,
        amount: pointTransactions.amount,
        balanceAfter: pointTransactions.balanceAfter,
        description: pointTransactions.description,
        createdAt: pointTransactions.createdAt,
      })
      .from(pointTransactions)
      .where(eq(pointTransactions.membershipId, membership.id))
      .orderBy(desc(pointTransactions.createdAt))
      .limit(30),
  ]);

  const now = Date.now();
  const checkinDates = checkinRows.map((row) => row.visitDate);

  return {
    membershipId: membership.id,
    pointsBalance: membership.pointsBalance,
    lifetimePoints: membership.lifetimePoints,
    visitCount: membership.visitCount,
    checkedInToday: checkinDates.includes(seoulDateKey()),
    checkinDates,
    coupons: couponRows.map((coupon) => ({
      id: coupon.id,
      title: coupon.title,
      description: coupon.description,
      status: coupon.status === "available" && coupon.expiresAt.getTime() <= now
        ? "expired"
        : coupon.status as MembershipCouponView["status"],
      issuedAt: coupon.issuedAt.toISOString(),
      expiresAt: coupon.expiresAt.toISOString(),
    })),
    pointTransactions: transactionRows.map((transaction) => ({
      ...transaction,
      createdAt: transaction.createdAt.toISOString(),
    })),
  };
}

export async function getTodayGamePlay(
  storeId: string,
  memberId: string,
): Promise<TodayGamePlayView | null> {
  const [play] = await getDb()
    .select({
      id: gamePlays.id,
      name: gamePlays.rewardNameSnapshot,
      description: gameRewardRules.description,
      rewardType: gameRewardRules.rewardType,
      rewardValue: gameRewardRules.rewardValue,
      golden: gamePlays.golden,
    })
    .from(gamePlays)
    .innerJoin(storeMemberships, eq(gamePlays.membershipId, storeMemberships.id))
    .leftJoin(gameRewardRules, eq(gamePlays.rewardRuleId, gameRewardRules.id))
    .where(
      and(
        eq(gamePlays.storeId, storeId),
        eq(storeMemberships.memberId, memberId),
        eq(gamePlays.playDate, seoulDateKey()),
      ),
    )
    .limit(1);

  if (!play) return null;

  return {
    id: play.id,
    name: play.name,
    description: play.description ?? "오늘의 게임 보상",
    rewardType: play.rewardType === "points" ? "points" : "coupon",
    rewardValue: play.rewardValue,
    golden: play.golden,
  };
}
