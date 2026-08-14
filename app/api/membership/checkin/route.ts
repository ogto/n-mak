import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { getSql } from "../../../../db";
import { readSessionToken, SESSION_COOKIE_NAME } from "../../../../lib/auth/session";
import { getStoreByPublicCode } from "../../../../lib/stores";

type CheckinResult = {
  awarded: boolean;
  points_balance: number;
  visit_count: number;
  visit_date: string;
};

export async function POST(request: Request) {
  const cookieStore = await cookies();
  const session = await readSessionToken(cookieStore.get(SESSION_COOKIE_NAME)?.value);

  if (!session) {
    return NextResponse.json({ error: "카카오 로그인이 필요합니다." }, { status: 401 });
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
      with membership as (
        select id, points_balance, visit_count
        from store_memberships
        where store_id = ${store.id} and member_id = ${session.memberId}
        limit 1
      ), new_checkin as (
        insert into checkins (membership_id, visit_date, source, points_awarded)
        select
          id,
          (now() at time zone 'Asia/Seoul')::date,
          'qr',
          100
        from membership
        on conflict (membership_id, visit_date) do nothing
        returning membership_id, visit_date, points_awarded
      ), credited as (
        update store_memberships as sm
        set
          points_balance = sm.points_balance + nc.points_awarded,
          lifetime_points = sm.lifetime_points + nc.points_awarded,
          visit_count = sm.visit_count + 1,
          last_visited_at = now(),
          updated_at = now()
        from new_checkin as nc
        where sm.id = nc.membership_id
        returning sm.id, sm.points_balance, sm.visit_count
      ), ledger as (
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
          credited.id,
          'earn',
          new_checkin.points_awarded,
          credited.points_balance,
          '일일 출석체크',
          'checkin',
          new_checkin.visit_date::text,
          'checkin:' || credited.id::text || ':' || new_checkin.visit_date::text
        from credited
        cross join new_checkin
        on conflict (idempotency_key) do nothing
      )
      select
        exists(select 1 from new_checkin) as awarded,
        coalesce(
          (select points_balance from credited),
          (select points_balance from membership)
        )::int as points_balance,
        coalesce(
          (select visit_count from credited),
          (select visit_count from membership)
        )::int as visit_count,
        (now() at time zone 'Asia/Seoul')::date::text as visit_date
      where exists(select 1 from membership)
    ` as CheckinResult[];
    const [result] = rows;

    if (!result) {
      return NextResponse.json({ error: "매장 멤버십을 찾을 수 없습니다." }, { status: 404 });
    }

    return NextResponse.json({
      awarded: result.awarded,
      pointsBalance: result.points_balance,
      visitCount: result.visit_count,
      visitDate: result.visit_date,
    });
  } catch (error) {
    console.error("Daily check-in failed.", error);
    return NextResponse.json({ error: "출석 처리 중 오류가 발생했습니다." }, { status: 500 });
  }
}
