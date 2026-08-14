import { NextResponse } from "next/server";
import { SESSION_COOKIE_NAME } from "../../../../lib/auth/session";

export async function POST(request: Request) {
  const response = NextResponse.json({ ok: true });
  response.cookies.set(SESSION_COOKIE_NAME, "", {
    httpOnly: true,
    secure: new URL(request.url).protocol === "https:",
    sameSite: "lax",
    path: "/",
    maxAge: 0,
  });
  return response;
}
