import { NextRequest, NextResponse } from "next/server";
import {
  activateKakaoMembership,
  getKakaoChannelFriendStatus,
  getKakaoChannelFriendStatusByAdmin,
} from "../../../../../../lib/auth/kakao";
import {
  createSessionToken,
  PENDING_CHANNEL_COOKIE_NAME,
  readPendingChannelToken,
  SESSION_COOKIE_NAME,
  SESSION_MAX_AGE_SECONDS,
} from "../../../../../../lib/auth/session";

export const dynamic = "force-dynamic";

function json(data: object, status = 200) {
  return NextResponse.json(data, {
    status,
    headers: { "Cache-Control": "no-store" },
  });
}

export async function POST(request: NextRequest) {
  const pending = await readPendingChannelToken(
    request.cookies.get(PENDING_CHANNEL_COOKIE_NAME)?.value,
  );

  if (!pending) {
    const response = json({ ok: false, status: "expired" }, 401);
    response.cookies.delete(PENDING_CHANNEL_COOKIE_NAME);
    return response;
  }

  const channelPublicId = process.env.KAKAO_CHANNEL_ID ?? "";
  let channelFriendStatus = await getKakaoChannelFriendStatusByAdmin(
    pending.kakaoUserId,
    channelPublicId,
  );

  if (channelFriendStatus === "unknown") {
    channelFriendStatus = await getKakaoChannelFriendStatus(
      pending.accessToken,
      channelPublicId,
    );
  }

  if (channelFriendStatus === "unknown") {
    return json({ ok: false, status: "channel_check_failed" }, 503);
  }

  if (channelFriendStatus !== "added") {
    return json({ ok: false, status: "channel_required" }, 409);
  }

  try {
    const member = await activateKakaoMembership({
      memberId: pending.memberId,
      kakaoUserId: pending.kakaoUserId,
      storeCode: pending.storeCode,
    });
    const sessionToken = await createSessionToken(member.id, member.kakaoUserId);
    const response = json({ ok: true, returnTo: pending.returnTo });

    response.cookies.set(SESSION_COOKIE_NAME, sessionToken, {
      httpOnly: true,
      secure: request.nextUrl.protocol === "https:",
      sameSite: "lax",
      path: "/",
      maxAge: SESSION_MAX_AGE_SECONDS,
    });
    response.cookies.delete(PENDING_CHANNEL_COOKIE_NAME);
    return response;
  } catch (error) {
    console.error("Kakao pending membership activation failed.", {
      message: error instanceof Error ? error.message : "unknown error",
    });
    return json({ ok: false, status: "failed" }, 500);
  }
}
