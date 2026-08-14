import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { getSql } from "../../../../../../db";
import { readSessionToken, SESSION_COOKIE_NAME } from "../../../../../../lib/auth/session";
import { getStoreByPublicCode } from "../../../../../../lib/stores";

type RedeemRouteProps = {
  params: Promise<{ couponId: string }>;
};

type RedeemResult = {
  id: string;
  redeemed_at: Date | string;
};

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export async function POST(request: Request, { params }: RedeemRouteProps) {
  const cookieStore = await cookies();
  const session = await readSessionToken(cookieStore.get(SESSION_COOKIE_NAME)?.value);

  if (!session) {
    return NextResponse.json({ error: "카카오 로그인이 필요합니다." }, { status: 401 });
  }

  const { couponId } = await params;
  if (!UUID_PATTERN.test(couponId)) {
    return NextResponse.json({ error: "올바르지 않은 쿠폰입니다." }, { status: 400 });
  }

  let storeCode = "";

  try {
    const body = await request.json() as { storeCode?: unknown };
    if (typeof body.storeCode === "string") storeCode = body.storeCode;
  } catch {
    return NextResponse.json({ error: "요청 형식이 올바르지 않습니다." }, { status: 400 });
  }

  const store = await getStoreByPublicCode(storeCode);
  if (!store) {
    return NextResponse.json({ error: "등록되지 않은 매장입니다." }, { status: 404 });
  }

  try {
    const sql = getSql();
    const rows = await sql`
      update member_coupons as mc
      set
        status = 'used',
        redeemed_at = now(),
        redemption_reference = 'member-confirmed:' || (now() at time zone 'Asia/Seoul')::text
      from store_memberships as sm
      where
        mc.id = cast(${couponId} as uuid)
        and mc.membership_id = sm.id
        and sm.store_id = ${store.id}
        and sm.member_id = ${session.memberId}
        and mc.status = 'available'
        and mc.expires_at > now()
      returning mc.id, mc.redeemed_at
    ` as RedeemResult[];
    const [redeemed] = rows;

    if (!redeemed) {
      return NextResponse.json(
        { error: "이미 사용했거나 유효기간이 지난 쿠폰입니다." },
        { status: 409 },
      );
    }

    return NextResponse.json({
      redeemed: true,
      couponId: redeemed.id,
      redeemedAt: new Date(redeemed.redeemed_at).toISOString(),
    });
  } catch (error) {
    console.error("Coupon redemption failed.", error);
    return NextResponse.json({ error: "쿠폰 사용 처리 중 오류가 발생했습니다." }, { status: 500 });
  }
}
