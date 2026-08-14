import { and, eq, isNull, sql } from "drizzle-orm";
import { cookies } from "next/headers";
import { getDb } from "../../db";
import { members, storeMemberships } from "../../db/schema";
import {
  PENDING_CHANNEL_COOKIE_NAME,
  readPendingChannelToken,
  readSessionToken,
  SESSION_COOKIE_NAME,
} from "./session";
import type { MemberView } from "./types";

export async function getCurrentMember(storeId: string): Promise<MemberView | null> {
  const cookieStore = await cookies();
  const session = await readSessionToken(cookieStore.get(SESSION_COOKIE_NAME)?.value);

  if (!session) return null;

  try {
    const [row] = await getDb()
      .select({
        id: members.id,
        nickname: members.nickname,
        profileImageUrl: members.profileImageUrl,
        channelFriendStatus: members.channelFriendStatus,
        tier: storeMemberships.tier,
        pointsBalance: storeMemberships.pointsBalance,
        lifetimePoints: storeMemberships.lifetimePoints,
        visitCount: storeMemberships.visitCount,
        couponCount: sql<number>`(
          select count(*)::int
          from member_coupons mc
          where mc.membership_id = ${storeMemberships.id}
            and mc.status = 'available'
            and mc.expires_at > now()
        )`,
      })
      .from(storeMemberships)
      .innerJoin(members, eq(storeMemberships.memberId, members.id))
      .where(
        and(
          eq(storeMemberships.storeId, storeId),
          eq(storeMemberships.memberId, session.memberId),
          isNull(members.deletedAt),
        ),
      )
      .limit(1);

    if (!row) return null;

    return {
      ...row,
      channelFriendStatus: row.channelFriendStatus as MemberView["channelFriendStatus"],
    };
  } catch (error) {
    console.error("Failed to load the current membership.", error);
    return null;
  }
}

export async function hasPendingKakaoSignup(storeCode: string) {
  const cookieStore = await cookies();
  const pending = await readPendingChannelToken(
    cookieStore.get(PENDING_CHANNEL_COOKIE_NAME)?.value,
  );

  return pending?.storeCode === storeCode;
}
