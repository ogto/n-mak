import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { StoreDetail, type DetailSection } from "../../../components/StoreDetail";
import { getCurrentMember } from "../../../../lib/auth/current-member";
import { getMembershipDetails } from "../../../../lib/membership";
import { getStoreByPublicCode } from "../../../../lib/stores";

const detailSections = new Set(["attendance", "coupons", "points", "store"]);

export const dynamic = "force-dynamic";

type DetailPageProps = {
  params: Promise<{ publicCode: string; section: string }>;
};

export async function generateMetadata({ params }: DetailPageProps): Promise<Metadata> {
  const { publicCode, section } = await params;
  const store = await getStoreByPublicCode(publicCode);
  const labels: Record<string, string> = {
    attendance: "출석체크",
    coupons: "내 쿠폰함",
    points: "포인트",
    store: "매장정보",
  };

  return {
    title: store ? `${labels[section] ?? "멤버십"} | ${store.displayName}` : "매장을 찾을 수 없습니다",
  };
}

export default async function DetailPage({ params }: DetailPageProps) {
  const { publicCode, section } = await params;
  const store = await getStoreByPublicCode(publicCode);

  if (!store || !detailSections.has(section)) {
    notFound();
  }

  const member = await getCurrentMember(store.id);
  const membership = member ? await getMembershipDetails(store.id, member.id) : null;

  return (
    <StoreDetail
      store={store}
      section={section as DetailSection}
      member={member}
      membership={membership}
      kakao={{
        javascriptKey: process.env.NEXT_PUBLIC_KAKAO_JS_KEY ?? "",
        channelPublicId: process.env.KAKAO_CHANNEL_ID ?? store.kakaoChannelId,
      }}
    />
  );
}
