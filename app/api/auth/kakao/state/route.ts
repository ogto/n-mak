import { NextRequest, NextResponse } from "next/server";
import { getStoreByPublicCode } from "../../../../../lib/stores";
import {
  createOAuthState,
  OAUTH_COOKIE_NAME,
  OAUTH_MAX_AGE_SECONDS,
  sanitizeReturnTo,
} from "../../../../../lib/auth/session";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const storeCode = request.nextUrl.searchParams.get("storeCode") ?? "";
  const store = await getStoreByPublicCode(storeCode);

  if (!store) {
    return NextResponse.json({ error: "등록되지 않은 매장입니다." }, { status: 400 });
  }

  const fallback = `/s/${store.publicCode}`;
  const returnTo = sanitizeReturnTo(request.nextUrl.searchParams.get("returnTo"), fallback);
  const nonce = crypto.randomUUID();
  const state = await createOAuthState({ nonce, returnTo, storeCode: store.publicCode });
  const response = NextResponse.json({ state });

  response.cookies.set(OAUTH_COOKIE_NAME, nonce, {
    httpOnly: true,
    secure: request.nextUrl.protocol === "https:",
    sameSite: "lax",
    path: "/api/auth/kakao",
    maxAge: OAUTH_MAX_AGE_SECONDS,
  });

  return response;
}
