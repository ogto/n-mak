import { neon } from "@neondatabase/serverless";

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  throw new Error("DATABASE_URL is not configured.");
}

const sql = neon(databaseUrl);
const storeRows = await sql`
  select display_name, branch_name, public_code
  from stores
  where active = true
  order by id
`;
const [counts] = await sql`
  select
    (select count(*)::int from stores) as stores,
    (select count(*)::int from coupon_campaigns) as campaigns,
    (select count(*)::int from game_reward_rules) as rewards
`;
const [probability] = await sql`
  select coalesce(sum(probability_basis_points), 0)::int as total
  from game_reward_rules
  where store_id = 'store_fish_brothers_cheongju' and active = true
`;

if (probability.total !== 10000) {
  throw new Error(`Active fishing reward probability must total 10000 basis points, received ${probability.total}.`);
}

console.log(JSON.stringify({ stores: storeRows, counts, probabilityBasisPoints: probability.total }, null, 2));
