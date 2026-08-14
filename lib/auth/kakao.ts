import { eq } from "drizzle-orm";
import { getDb, getSql } from "../../db";
import { members, storeMemberships, stores } from "../../db/schema";

type KakaoTokenResponse = {
  access_token?: string;
  error?: string;
  error_description?: string;
};

type KakaoUserResponse = {
  id: number;
  kakao_account?: {
    name?: string;
    legal_name?: string;
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

type KakaoUnlinkResponse = {
  id?: number;
  code?: number;
  msg?: string;
};

export type KakaoChannelFriendStatus = "unknown" | "added" | "not_added" | "blocked";

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
    url.searchParams.set("channel_id_type", "channel_public_id");
    const response = await fetch(url, {
      headers: { Authorization: `Bearer ${accessToken}` },
      cache: "no-store",
    });

    if (!response.ok) {
      console.warn("Kakao channel relationship lookup was unavailable.", {
        status: response.status,
      });
      return "unknown" as const;
    }

    const result = (await response.json()) as KakaoChannelResponse;
    const relation = result.channels?.find(
      (channel) => channel.channel_public_id === channelPublicId,
    )?.relation;

    if (relation === "ADDED") return "added" as const;
    if (relation === "BLOCKED") return "blocked" as const;
    if (relation === "NONE") return "not_added" as const;
    return "unknown" as const;
  } catch (error) {
    console.warn("Kakao channel relationship lookup failed.", {
      message: error instanceof Error ? error.message : "unknown error",
    });
    return "unknown" as const;
  }
}

export async function unlinkKakaoUser(kakaoUserId: string) {
  const adminKey = process.env.KAKAO_ADMIN_KEY;

  if (!adminKey) {
    throw new Error("KAKAO_ADMIN_KEY is not configured.");
  }

  const response = await fetch("https://kapi.kakao.com/v1/user/unlink", {
    method: "POST",
    headers: {
      Authorization: `KakaoAK ${adminKey}`,
      "Content-Type": "application/x-www-form-urlencoded;charset=utf-8",
    },
    body: new URLSearchParams({
      target_id_type: "user_id",
      target_id: kakaoUserId,
    }),
    cache: "no-store",
  });
  const result = (await response.json()) as KakaoUnlinkResponse;

  if (!response.ok || String(result.id ?? "") !== kakaoUserId) {
    throw new Error(`Kakao unlink failed: ${result.code ?? response.status} ${result.msg ?? ""}`.trim());
  }
}

export async function upsertKakaoMember(input: {
  user: KakaoUserResponse;
  storeCode: string;
  channelFriendStatus: KakaoChannelFriendStatus;
}) {
  if (input.channelFriendStatus !== "added") {
    throw new Error("Kakao channel friendship is required before creating a membership.");
  }
  const db = getDb();
  const [store] = await db
    .select({ id: stores.id })
    .from(stores)
    .where(eq(stores.publicCode, input.storeCode))
    .limit(1);

  if (!store) throw new Error("The requested store is not registered in the database.");

  const now = new Date();
  const kakaoUserId = String(input.user.id);
  const account = input.user.kakao_account;
  const profile = account?.profile;
  const displayName = account?.name ?? account?.legal_name ?? profile?.nickname ?? null;
  const updateValues = {
    lastLoginAt: now,
    deletedAt: null,
    updatedAt: now,
    ...(displayName ? { nickname: displayName } : {}),
    ...(profile?.profile_image_url ? { profileImageUrl: profile.profile_image_url } : {}),
    channelFriendStatus: input.channelFriendStatus,
  };
  const [member] = await db
    .insert(members)
    .values({
      kakaoUserId,
      nickname: displayName,
      profileImageUrl: profile?.profile_image_url ?? null,
      channelFriendStatus: input.channelFriendStatus,
      lastLoginAt: now,
      updatedAt: now,
    })
    .onConflictDoUpdate({
      target: members.kakaoUserId,
      set: updateValues,
    })
    .returning({ id: members.id, kakaoUserId: members.kakaoUserId });

  const sql = getSql();
  const signupIdempotencyKey = `signup:${store.id}:${member.id}`;

  await db
    .insert(storeMemberships)
    .values({ storeId: store.id, memberId: member.id })
    .onConflictDoNothing({
      target: [storeMemberships.storeId, storeMemberships.memberId],
    });

  await sql`
    with membership as (
      select id, points_balance
      from store_memberships
      where store_id = ${store.id} and member_id = ${member.id}
      limit 1
    ), bonus as (
      insert into point_transactions (
        membership_id,
        transaction_type,
        amount,
        balance_after,
        description,
        reference_type,
        reference_id,
        idempotency_key
      )
      select
        id,
        'earn',
        500,
        points_balance + 500,
        '신규 가입 축하 포인트',
        'signup',
        ${member.id},
        ${signupIdempotencyKey}
      from membership
      on conflict (idempotency_key) do nothing
      returning membership_id
    )
    update store_memberships as sm
    set
      points_balance = sm.points_balance + 500,
      lifetime_points = sm.lifetime_points + 500,
      updated_at = now()
    from bonus
    where sm.id = bonus.membership_id
  `;

  return member;
}
