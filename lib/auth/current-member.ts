import { and, eq, isNull } from "drizzle-orm";
import { cookies } from "next/headers";
import { getDb } from "../../db";
import { members, storeMemberships } from "../../db/schema";
import { readSessionToken, SESSION_COOKIE_NAME } from "./session";
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
