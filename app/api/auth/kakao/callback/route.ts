import { NextRequest, NextResponse } from "next/server";
import {
  exchangeKakaoCode,
  getKakaoChannelFriendStatus,
  getKakaoUser,
  upsertKakaoMember,
} from "../../../../../lib/auth/kakao";
import {
  createSessionToken,
  OAUTH_COOKIE_NAME,
  readOAuthState,
  SESSION_COOKIE_NAME,
  SESSION_MAX_AGE_SECONDS,
} from "../../../../../lib/auth/session";

export const dynamic = "force-dynamic";

function redirectWithStatus(request: NextRequest, returnTo: string, status: string) {
  const url = new URL(returnTo, request.nextUrl.origin);
  url.searchParams.set("auth", status);
  const response = NextResponse.redirect(url);
  response.cookies.delete(OAUTH_COOKIE_NAME);
  return response;
}

export async function GET(request: NextRequest) {
  const state = await readOAuthState(request.nextUrl.searchParams.get("state"));
  const expectedNonce = request.cookies.get(OAUTH_COOKIE_NAME)?.value;

  if (!state || !expectedNonce || state.nonce !== expectedNonce) {
    return redirectWithStatus(request, "/s/1xbHos", "invalid_state");
  }

  const oauthError = request.nextUrl.searchParams.get("error");
  if (oauthError) {
    const status = oauthError === "consent_required" ? "consent_required" : "cancelled";
    return redirectWithStatus(request, state.returnTo, status);
  }

  const code = request.nextUrl.searchParams.get("code");
  if (!code) return redirectWithStatus(request, state.returnTo, "failed");

  try {
    const redirectUri = new URL("/api/auth/kakao/callback", request.nextUrl.origin).toString();
    const accessToken = await exchangeKakaoCode(code, redirectUri);
    const user = await getKakaoUser(accessToken);
    const channelPublicId = process.env.KAKAO_CHANNEL_ID ?? "";
    const channelFriendStatus = await getKakaoChannelFriendStatus(accessToken, channelPublicId);

    if (channelFriendStatus === "unknown") {
      return redirectWithStatus(request, state.returnTo, "channel_check_failed");
    }

    if (channelFriendStatus !== "added") {
      return redirectWithStatus(request, state.returnTo, "channel_required");
    }

    const member = await upsertKakaoMember({
      user,
      storeCode: state.storeCode,
      channelFriendStatus,
    });
    const sessionToken = await createSessionToken(member.id, member.kakaoUserId);
    const url = new URL(state.returnTo, request.nextUrl.origin);
    url.searchParams.set("auth", "success");
    const response = NextResponse.redirect(url);

    response.cookies.set(SESSION_COOKIE_NAME, sessionToken, {
      httpOnly: true,
      secure: request.nextUrl.protocol === "https:",
      sameSite: "lax",
      path: "/",
      maxAge: SESSION_MAX_AGE_SECONDS,
    });
    response.cookies.delete(OAUTH_COOKIE_NAME);
    return response;
  } catch (error) {
    console.error("Kakao login callback failed.", error);
    return redirectWithStatus(request, state.returnTo, "failed");
  }
}
