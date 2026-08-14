import { and, eq } from "drizzle-orm";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { getDb, getSql } from "../../../../db";
import { couponCampaigns, gameRewardRules } from "../../../../db/schema";
import { readSessionToken, SESSION_COOKIE_NAME } from "../../../../lib/auth/session";
import { getStoreByPublicCode } from "../../../../lib/stores";

type GamePlayResult = {
  id: string;
  reward_name: string;
  description: string;
  reward_type: "coupon" | "points";
  reward_value: number | null;
  golden: boolean;
};

function weightedRandom(total: number) {
  const random = new Uint32Array(1);
  crypto.getRandomValues(random);
  return random[0] % total;
}

export async function POST(request: Request) {
  const cookieStore = await cookies();
  const session = await readSessionToken(cookieStore.get(SESSION_COOKIE_NAME)?.value);

  if (!session) {
    return NextResponse.json({ error: "게임 참여 전에 카카오 로그인이 필요합니다." }, { status: 401 });
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
    const rules = await getDb()
      .select({
        id: gameRewardRules.id,
        name: gameRewardRules.name,
        description: gameRewardRules.description,
        rewardType: gameRewardRules.rewardType,
        rewardValue: gameRewardRules.rewardValue,
        probability: gameRewardRules.probabilityBasisPoints,
        couponCampaignId: gameRewardRules.couponCampaignId,
        golden: gameRewardRules.golden,
        campaignTitle: couponCampaigns.title,
        campaignDescription: couponCampaigns.description,
        validDays: couponCampaigns.validDays,
      })
      .from(gameRewardRules)
      .leftJoin(couponCampaigns, eq(gameRewardRules.couponCampaignId, couponCampaigns.id))
      .where(and(eq(gameRewardRules.storeId, store.id), eq(gameRewardRules.active, true)));

    const totalProbability = rules.reduce((sum, rule) => sum + rule.probability, 0);

    if (rules.length === 0 || totalProbability <= 0) {
      return NextResponse.json({ error: "현재 받을 수 있는 게임 보상이 없습니다." }, { status: 503 });
    }

    const roll = weightedRandom(totalProbability);
    let cursor = 0;
    const selected = rules.find((rule) => {
      cursor += rule.probability;
      return roll < cursor;
    }) ?? rules[rules.length - 1];
    const sql = getSql();
    const rewardValue = selected.rewardValue ?? 0;
    const campaignId = selected.couponCampaignId;
    const campaignTitle = selected.campaignTitle ?? selected.name;
    const campaignDescription = selected.campaignDescription ?? selected.description;
    const validDays = selected.validDays ?? 14;

    await sql`
      with membership as (
        select id
        from store_memberships
        where store_id = ${store.id} and member_id = ${session.memberId}
        limit 1
      ), new_play as (
        insert into game_plays (
          store_id,
          membership_id,
          reward_rule_id,
          play_date,
          reward_name_snapshot,
          golden,
          idempotency_key
        )
        select
          ${store.id},
          membership.id,
          ${selected.id},
          (now() at time zone 'Asia/Seoul')::date,
          ${selected.name},
          ${selected.golden},
          'game:' || ${store.id} || ':' || membership.id::text || ':' || (now() at time zone 'Asia/Seoul')::date::text
        from membership
        on conflict (store_id, membership_id, play_date) do nothing
        returning id, membership_id
      ), new_coupon as (
        insert into member_coupons (
          membership_id,
          campaign_id,
          title_snapshot,
          description_snapshot,
          status,
          issued_by,
          issued_reference_id,
          expires_at
        )
        select
          new_play.membership_id,
          ${campaignId},
          ${campaignTitle},
          ${campaignDescription},
          'available',
          'game',
          new_play.id::text,
          now() + (${validDays} * interval '1 day')
        from new_play
        where ${selected.rewardType} = 'coupon' and cast(${campaignId} as uuid) is not null
        returning id, issued_reference_id
      ), linked_coupon as (
        update game_plays as gp
        set
          claimed = true,
          claimed_at = now(),
          member_coupon_id = new_coupon.id
        from new_coupon
        where gp.id = new_coupon.issued_reference_id::uuid
        returning gp.id
      ), credited as (
        update store_memberships as sm
        set
          points_balance = sm.points_balance + ${rewardValue},
          lifetime_points = sm.lifetime_points + ${rewardValue},
          updated_at = now()
        from new_play
        where
          sm.id = new_play.membership_id
          and ${selected.rewardType} = 'points'
          and ${rewardValue} > 0
        returning sm.id, sm.points_balance
      ), point_ledger as (
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
          ${rewardValue},
          credited.points_balance,
          ${selected.name},
          'game',
          new_play.id::text,
          'game:' || new_play.id::text || ':points'
        from credited
        cross join new_play
        on conflict (idempotency_key) do nothing
      ), claimed_points as (
        update game_plays as gp
        set claimed = true, claimed_at = now()
        from new_play
        where gp.id = new_play.id and ${selected.rewardType} = 'points'
        returning gp.id
      )
      select
        exists(select 1 from new_play) as created,
        exists(select 1 from linked_coupon) as coupon_issued,
        exists(select 1 from claimed_points) as points_issued
    `;

    await sql`
      update game_plays as gp
      set
        claimed = true,
        claimed_at = coalesce(gp.claimed_at, now()),
        member_coupon_id = coalesce(
          gp.member_coupon_id,
          (
            select mc.id
            from member_coupons mc
            where mc.issued_reference_id = gp.id::text
            order by mc.issued_at desc
            limit 1
          )
        )
      from store_memberships as sm
      where
        gp.membership_id = sm.id
        and gp.store_id = ${store.id}
        and sm.member_id = ${session.memberId}
        and gp.play_date = (now() at time zone 'Asia/Seoul')::date
    `;

    const rows = await sql`
      select
        gp.id,
        gp.reward_name_snapshot as reward_name,
        coalesce(grr.description, '오늘의 게임 보상') as description,
        coalesce(grr.reward_type, 'coupon') as reward_type,
        grr.reward_value,
        gp.golden
      from game_plays gp
      left join game_reward_rules grr on grr.id = gp.reward_rule_id
      inner join store_memberships sm on sm.id = gp.membership_id
      where
        gp.store_id = ${store.id}
        and sm.member_id = ${session.memberId}
        and gp.play_date = (now() at time zone 'Asia/Seoul')::date
      limit 1
    ` as GamePlayResult[];
    const [result] = rows;

    if (!result) {
      return NextResponse.json({ error: "게임 멤버십을 찾을 수 없습니다." }, { status: 404 });
    }

    return NextResponse.json({
      reward: {
        id: result.id,
        name: result.reward_name,
        description: result.description,
        rewardType: result.reward_type,
        rewardValue: result.reward_value,
        golden: result.golden,
      },
    });
  } catch (error) {
    console.error("Game reward issue failed.", error);
    return NextResponse.json({ error: "게임 보상을 저장하지 못했습니다." }, { status: 500 });
  }
}
