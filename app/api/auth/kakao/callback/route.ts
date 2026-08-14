import { NextRequest, NextResponse } from "next/server";
import {
  exchangeKakaoCode,
  getSafeKakaoOAuthError,
  getKakaoChannelFriendStatus,
  getKakaoUser,
  KakaoOAuthError,
  upsertKakaoMember,
} from "../../../../../lib/auth/kakao";
import {
  createPendingChannelToken,
  createSessionToken,
  OAUTH_COOKIE_NAME,
  PENDING_CHANNEL_COOKIE_NAME,
  PENDING_CHANNEL_MAX_AGE_SECONDS,
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

function getRecoveryPath(storeCode: string, returnTo: string) {
  const params = new URLSearchParams({ next: returnTo });
  return `/s/${storeCode}?${params}`;
}

function setPendingChannelCookie(request: NextRequest, response: NextResponse, token: string) {
  response.cookies.set(PENDING_CHANNEL_COOKIE_NAME, token, {
    httpOnly: true,
    secure: request.nextUrl.protocol === "https:",
    sameSite: "lax",
    path: "/",
    maxAge: PENDING_CHANNEL_MAX_AGE_SECONDS,
  });
}

export async function GET(request: NextRequest) {
  const state = await readOAuthState(request.nextUrl.searchParams.get("state"));
  const expectedNonce = request.cookies.get(OAUTH_COOKIE_NAME)?.value;

  if (!state || !expectedNonce || state.nonce !== expectedNonce) {
    return redirectWithStatus(request, "/s/1xbHos", "invalid_state");
  }

  const oauthError = request.nextUrl.searchParams.get("error");
  if (oauthError) {
    const description = (request.nextUrl.searchParams.get("error_description") ?? "").slice(0, 240);
    console.warn("Kakao authorization was not completed.", { oauthError, description });
    const status = oauthError === "consent_required"
      ? "consent_required"
      : oauthError === "access_denied"
        ? "cancelled"
        : "failed";
    return redirectWithStatus(
      request,
      getRecoveryPath(state.storeCode, state.returnTo),
      status,
    );
  }

  const code = request.nextUrl.searchParams.get("code");
  if (!code) {
    return redirectWithStatus(
      request,
      getRecoveryPath(state.storeCode, state.returnTo),
      "failed",
    );
  }

  try {
    const redirectUri = new URL("/api/auth/kakao/callback", request.nextUrl.origin).toString();
    const accessToken = await exchangeKakaoCode(code, redirectUri);
    const user = await getKakaoUser(accessToken);
    const channelPublicId = process.env.KAKAO_CHANNEL_ID ?? "";
    const channelFriendStatus = await getKakaoChannelFriendStatus(accessToken, channelPublicId);
    const member = await upsertKakaoMember({
      user,
      storeCode: state.storeCode,
      channelFriendStatus,
    });

    if (channelFriendStatus !== "added") {
      const pendingToken = await createPendingChannelToken({
        memberId: member.id,
        kakaoUserId: member.kakaoUserId,
        storeCode: state.storeCode,
        returnTo: state.returnTo,
        accessToken,
      });
      const status = channelFriendStatus === "unknown"
        ? "channel_check_failed"
        : "channel_required";
      const response = redirectWithStatus(
        request,
        getRecoveryPath(state.storeCode, state.returnTo),
        status,
      );
      setPendingChannelCookie(request, response, pendingToken);
      return response;
    }

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
    response.cookies.delete(PENDING_CHANNEL_COOKIE_NAME);
    return response;
  } catch (error) {
    const recoveryPath = getRecoveryPath(state.storeCode, state.returnTo);

    if (error instanceof KakaoOAuthError) {
      const details = getSafeKakaoOAuthError(error);
      console.error("Kakao login token exchange failed.", details);
      const rateLimited = error.oauthError === "invalid_request"
        && error.description.toLowerCase().includes("rate limit");
      return redirectWithStatus(request, recoveryPath, rateLimited ? "rate_limited" : "failed");
    }

    console.error("Kakao login callback failed.", {
      message: error instanceof Error ? error.message : "unknown error",
    });
    return redirectWithStatus(request, recoveryPath, "failed");
  }
}
