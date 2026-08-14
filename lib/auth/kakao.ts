import { eq } from "drizzle-orm";
import { getDb } from "../../db";
import { members, storeMemberships, stores } from "../../db/schema";

type KakaoTokenResponse = {
  access_token?: string;
  error?: string;
  error_description?: string;
};

type KakaoUserResponse = {
  id: number;
  kakao_account?: {
    profile?: {
      nickname?: string;
      profile_image_url?: string;
    };
  };
};

type KakaoChannelResponse = {
  channels?: Array<{
    channel_public_id?: string;
    relation?: "ADDED" | "BLOCKED" | "NONE";
  }>;
};

export async function exchangeKakaoCode(code: string, redirectUri: string) {
  const restApiKey = process.env.KAKAO_REST_API_KEY;
  const clientSecret = process.env.KAKAO_CLIENT_SECRET;

  if (!restApiKey || !clientSecret) {
    throw new Error("Kakao server credentials are not configured.");
  }

  const body = new URLSearchParams({
    grant_type: "authorization_code",
    client_id: restApiKey,
    client_secret: clientSecret,
    redirect_uri: redirectUri,
    code,
  });
  const response = await fetch("https://kauth.kakao.com/oauth/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded;charset=utf-8" },
    body,
    cache: "no-store",
  });
  const result = (await response.json()) as KakaoTokenResponse;

  if (!response.ok || !result.access_token) {
    throw new Error(`Kakao token exchange failed: ${result.error ?? response.status}`);
  }

  return result.access_token;
}

export async function getKakaoUser(accessToken: string) {
  const response = await fetch("https://kapi.kakao.com/v2/user/me", {
    headers: { Authorization: `Bearer ${accessToken}` },
    cache: "no-store",
  });

  if (!response.ok) throw new Error(`Kakao user lookup failed: ${response.status}`);

  return (await response.json()) as KakaoUserResponse;
}

export async function getKakaoChannelFriendStatus(accessToken: string, channelPublicId: string) {
  if (!channelPublicId) return "unknown" as const;

  try {
    const url = new URL("https://kapi.kakao.com/v2/api/talk/channels");
    url.searchParams.set("channel_ids", channelPublicId);
    const response = await fetch(url, {
      headers: { Authorization: `Bearer ${accessToken}` },
      cache: "no-store",
    });

    if (!response.ok) return "unknown" as const;

    const result = (await response.json()) as KakaoChannelResponse;
    const relation = result.channels?.find(
      (channel) => channel.channel_public_id === channelPublicId,
    )?.relation;

    if (relation === "ADDED") return "added" as const;
    if (relation === "BLOCKED") return "blocked" as const;
    if (relation === "NONE") return "not_added" as const;
    return "unknown" as const;
  } catch {
    return "unknown" as const;
  }
}

export async function upsertKakaoMember(input: {
  user: KakaoUserResponse;
  storeCode: string;
  channelFriendStatus: "unknown" | "added" | "not_added" | "blocked";
}) {
  const db = getDb();
  const [store] = await db
    .select({ id: stores.id })
    .from(stores)
    .where(eq(stores.publicCode, input.storeCode))
    .limit(1);

  if (!store) throw new Error("The requested store is not registered in the database.");

  const now = new Date();
  const kakaoUserId = String(input.user.id);
  const profile = input.user.kakao_account?.profile;
  const [member] = await db
    .insert(members)
    .values({
      kakaoUserId,
      nickname: profile?.nickname ?? null,
      profileImageUrl: profile?.profile_image_url ?? null,
      channelFriendStatus: input.channelFriendStatus,
      lastLoginAt: now,
      updatedAt: now,
    })
    .onConflictDoUpdate({
      target: members.kakaoUserId,
      set: {
        nickname: profile?.nickname ?? null,
        profileImageUrl: profile?.profile_image_url ?? null,
        channelFriendStatus: input.channelFriendStatus,
        lastLoginAt: now,
        deletedAt: null,
        updatedAt: now,
      },
    })
    .returning({ id: members.id, kakaoUserId: members.kakaoUserId });

  await db
    .insert(storeMemberships)
    .values({ storeId: store.id, memberId: member.id })
    .onConflictDoNothing({
      target: [storeMemberships.storeId, storeMemberships.memberId],
    });

  return member;
}
