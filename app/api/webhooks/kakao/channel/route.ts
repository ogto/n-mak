import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { getDb } from "../../../../../db";
import { kakaoChannelEvents, members } from "../../../../../db/schema";

type KakaoChannelWebhookPayload = {
  event?: unknown;
  id?: unknown;
  id_type?: unknown;
  channel_public_id?: unknown;
  channel_uuid?: unknown;
  updated_at?: unknown;
  [key: string]: unknown;
};

async function secureEqual(left: string, right: string) {
  const encoder = new TextEncoder();
  const [leftHash, rightHash] = await Promise.all([
    crypto.subtle.digest("SHA-256", encoder.encode(left)),
    crypto.subtle.digest("SHA-256", encoder.encode(right)),
  ]);
  const leftBytes = new Uint8Array(leftHash);
  const rightBytes = new Uint8Array(rightHash);
  let difference = 0;

  for (let index = 0; index < leftBytes.length; index += 1) {
    difference |= leftBytes[index] ^ rightBytes[index];
  }

  return difference === 0;
}

function isValidPayload(payload: KakaoChannelWebhookPayload) {
  return (
    (payload.event === "added" || payload.event === "blocked")
    && typeof payload.id === "string"
    && (payload.id_type === "app_user_id" || payload.id_type === "open_id")
    && typeof payload.channel_public_id === "string"
    && typeof payload.updated_at === "string"
  );
}

export async function POST(request: Request) {
  const adminKey = process.env.KAKAO_ADMIN_KEY;

  if (!adminKey) {
    console.error("KAKAO_ADMIN_KEY is not configured for the Kakao channel webhook.");
    return NextResponse.json({ error: "Webhook is not configured." }, { status: 503 });
  }

  const authorization = request.headers.get("authorization") ?? "";
  const resourceId = request.headers.get("x-kakao-resource-id") ?? "";
  const userAgent = request.headers.get("user-agent") ?? "";
  const validAuthorization = await secureEqual(authorization, `KakaoAK ${adminKey}`);

  if (!validAuthorization || !resourceId || !userAgent.startsWith("KakaoOpenAPI/")) {
    return NextResponse.json({ error: "Unauthorized webhook." }, { status: 401 });
  }

  let payload: KakaoChannelWebhookPayload;

  try {
    payload = await request.json() as KakaoChannelWebhookPayload;
  } catch {
    return NextResponse.json({ error: "Invalid JSON payload." }, { status: 400 });
  }

  if (!isValidPayload(payload)) {
    return NextResponse.json({ error: "Invalid webhook payload." }, { status: 400 });
  }

  const expectedChannelPublicId = process.env.KAKAO_CHANNEL_ID;
  if (expectedChannelPublicId && payload.channel_public_id !== expectedChannelPublicId) {
    return NextResponse.json({ error: "Unknown Kakao channel." }, { status: 400 });
  }

  try {
    const db = getDb();
    const kakaoUserId = payload.id as string;
    const event = payload.event as "added" | "blocked";
    const channelPublicId = payload.channel_public_id as string;
    const [member] = payload.id_type === "app_user_id"
      ? await db
        .select({ id: members.id })
        .from(members)
        .where(eq(members.kakaoUserId, kakaoUserId))
        .limit(1)
      : [];
    const [createdEvent] = await db
      .insert(kakaoChannelEvents)
      .values({
        kakaoResourceId: resourceId,
        memberId: member?.id ?? null,
        kakaoUserId,
        channelPublicId,
        action: event,
        payload,
      })
      .onConflictDoNothing({ target: kakaoChannelEvents.kakaoResourceId })
      .returning({ id: kakaoChannelEvents.id });

    if (createdEvent && member) {
      await db
        .update(members)
        .set({
          channelFriendStatus: event,
          updatedAt: new Date(payload.updated_at as string),
        })
        .where(eq(members.id, member.id));
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Kakao channel webhook processing failed.", error);
    return NextResponse.json({ error: "Webhook processing failed." }, { status: 500 });
  }
}
