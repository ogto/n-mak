import { neon } from "@neondatabase/serverless";

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  throw new Error("DATABASE_URL is not configured.");
}

const sql = neon(databaseUrl);

const storeRows = [
  {
    id: "store_fish_brothers_cheongju",
    internalKey: "a-fish-brothers",
    publicCode: "1xbHos",
    displayName: "어시장브라더스",
    branchName: "청주점",
    address: "충북 청주시 흥덕구 직지대로 551 A동 1층 116~120호",
  },
  {
    id: "store_bread_bank",
    internalKey: "bread-bank",
    publicCode: "breadBank",
    displayName: "빵장고",
    branchName: "은행점",
    address: null,
  },
];

for (const store of storeRows) {
  await sql`
    insert into stores (
      id, internal_key, public_code, display_name, branch_name, address
    ) values (
      ${store.id}, ${store.internalKey}, ${store.publicCode},
      ${store.displayName}, ${store.branchName}, ${store.address}
    )
    on conflict (id) do update set
      internal_key = excluded.internal_key,
      public_code = excluded.public_code,
      display_name = excluded.display_name,
      branch_name = excluded.branch_name,
      address = excluded.address,
      updated_at = now()
  `;
}

const fishStoreId = "store_fish_brothers_cheongju";
const campaignRows = [
  { code: "TASTE_SEAFOOD", title: "맛보기 해산물", description: "오늘의 해산물 한 접시", type: "free_item", value: null, validDays: 7 },
  { code: "SOJU_1", title: "소주 1병", description: "테이블당 1회 사용 가능", type: "free_item", value: 1, validDays: 7 },
  { code: "BEER_1", title: "맥주 1병", description: "테이블당 1회 사용 가능", type: "free_item", value: 1, validDays: 7 },
  { code: "SODA_1", title: "음료 1캔", description: "원하는 탄산음료 1캔", type: "free_item", value: 1, validDays: 7 },
  { code: "SASHIMI_10", title: "모둠회 10% 할인", description: "5만원 이상 주문 시 사용", type: "percent_discount", value: 10, validDays: 7 },
];

const campaignIds = new Map();
for (const campaign of campaignRows) {
  const [saved] = await sql`
    insert into coupon_campaigns (
      store_id, code, title, description, benefit_type, benefit_value,
      minimum_order_amount, valid_days, per_member_limit
    ) values (
      ${fishStoreId}, ${campaign.code}, ${campaign.title}, ${campaign.description},
      ${campaign.type}, ${campaign.value},
      ${campaign.code === "SASHIMI_10" ? 50000 : 0}, ${campaign.validDays}, 1
    )
    on conflict (store_id, code) do update set
      title = excluded.title,
      description = excluded.description,
      benefit_type = excluded.benefit_type,
      benefit_value = excluded.benefit_value,
      minimum_order_amount = excluded.minimum_order_amount,
      valid_days = excluded.valid_days,
      active = true,
      updated_at = now()
    returning id
  `;
  campaignIds.set(campaign.code, saved.id);
}

const rewardRows = [
  { code: "TASTE_SEAFOOD", name: "맛보기 해산물", description: "오늘의 해산물 한 접시", type: "coupon", value: null, probability: 500, golden: true },
  { code: "SOJU_1", name: "소주 1병", description: "테이블당 1회 사용 가능", type: "coupon", value: 1, probability: 1000, golden: false },
  { code: "BEER_1", name: "맥주 1병", description: "테이블당 1회 사용 가능", type: "coupon", value: 1, probability: 1000, golden: false },
  { code: "SODA_1", name: "음료 1캔", description: "원하는 탄산음료 1캔", type: "coupon", value: 1, probability: 1500, golden: false },
  { code: "POINT_500", name: "500 포인트", description: "결제할 때 바로 사용 가능", type: "points", value: 500, probability: 2000, golden: false },
  { code: "POINT_300", name: "300 포인트", description: "멤버십 포인트 즉시 적립", type: "points", value: 300, probability: 2000, golden: false },
  { code: "SASHIMI_10", name: "모둠회 10% 할인", description: "5만원 이상 주문 시 사용", type: "coupon", value: 10, probability: 2000, golden: false },
];

for (const reward of rewardRows) {
  const campaignId = campaignIds.get(reward.code) ?? null;
  await sql`
    insert into game_reward_rules (
      store_id, code, name, description, reward_type, reward_value,
      probability_basis_points, coupon_campaign_id, golden
    ) values (
      ${fishStoreId}, ${reward.code}, ${reward.name}, ${reward.description},
      ${reward.type}, ${reward.value}, ${reward.probability}, ${campaignId}, ${reward.golden}
    )
    on conflict (store_id, code) do update set
      name = excluded.name,
      description = excluded.description,
      reward_type = excluded.reward_type,
      reward_value = excluded.reward_value,
      probability_basis_points = excluded.probability_basis_points,
      coupon_campaign_id = excluded.coupon_campaign_id,
      golden = excluded.golden,
      active = true,
      updated_at = now()
  `;
}

console.log(`Seeded ${storeRows.length} stores, ${campaignRows.length} coupon campaigns, and ${rewardRows.length} game rewards.`);
