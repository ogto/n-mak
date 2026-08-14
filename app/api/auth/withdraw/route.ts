import { and, eq } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";
import { members } from "../../../../db/schema";
import { getDb } from "../../../../db";
import { unlinkKakaoUser } from "../../../../lib/auth/kakao";
import {
  PENDING_CHANNEL_COOKIE_NAME,
  readSessionToken,
  SESSION_COOKIE_NAME,
} from "../../../../lib/auth/session";

export const dynamic = "force-dynamic";

function clearSession(response: NextResponse, request: NextRequest) {
  response.cookies.set(SESSION_COOKIE_NAME, "", {
    httpOnly: true,
    secure: request.nextUrl.protocol === "https:",
    sameSite: "lax",
    path: "/",
    maxAge: 0,
  });
  response.cookies.delete(PENDING_CHANNEL_COOKIE_NAME);
  return response;
}

export async function POST(request: NextRequest) {
  const session = await readSessionToken(request.cookies.get(SESSION_COOKIE_NAME)?.value);

  if (!session) {
    return clearSession(
      NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 }),
      request,
    );
  }

  const db = getDb();
  const [member] = await db
    .select({ id: members.id, kakaoUserId: members.kakaoUserId })
    .from(members)
    .where(and(eq(members.id, session.memberId), eq(members.kakaoUserId, session.kakaoUserId)))
    .limit(1);

  if (!member) {
    return clearSession(NextResponse.json({ withdrawn: true }), request);
  }

  try {
    await unlinkKakaoUser(member.kakaoUserId);
    await db.delete(members).where(eq(members.id, member.id));
    return clearSession(NextResponse.json({ withdrawn: true }), request);
  } catch (error) {
    console.error("Kakao membership withdrawal failed.", {
      memberId: member.id,
      message: error instanceof Error ? error.message : "unknown error",
    });
    return NextResponse.json(
      { error: "탈퇴 처리에 실패했습니다. 잠시 후 다시 시도해 주세요." },
      { status: 502 },
    );
  }
}
