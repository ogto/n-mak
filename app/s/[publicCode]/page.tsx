import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Storefront } from "../../components/Storefront";
import { getStoreByPublicCode } from "../../../lib/stores";
import { getCurrentMember } from "../../../lib/auth/current-member";

export const dynamic = "force-dynamic";

type StorePageProps = {
  params: Promise<{ publicCode: string }>;
};

export async function generateMetadata({ params }: StorePageProps): Promise<Metadata> {
  const { publicCode } = await params;
  const store = await getStoreByPublicCode(publicCode);

  if (!store) {
    return { title: "매장을 찾을 수 없습니다" };
  }

  return {
    title: `${store.displayName} ${store.branchName}`,
    description: `${store.displayName}의 게임, 쿠폰, 포인트 혜택을 만나보세요.`,
    openGraph: {
      title: `${store.displayName} ${store.branchName}`,
      description: "게임으로 즐기고, 혜택으로 다시 만나요",
    },
    twitter: {
      card: "summary",
      title: `${store.displayName} ${store.branchName}`,
      description: "게임으로 즐기고, 혜택으로 다시 만나요",
    },
  };
}

export default async function StorePage({ params }: StorePageProps) {
  const { publicCode } = await params;
  const store = await getStoreByPublicCode(publicCode);

  if (!store) {
    notFound();
  }

  const member = await getCurrentMember(store.id);

  return (
    <Storefront
      store={store}
      member={member}
      kakao={{
        javascriptKey: process.env.NEXT_PUBLIC_KAKAO_JS_KEY ?? "",
        channelPublicId: process.env.KAKAO_CHANNEL_ID ?? store.kakaoChannelId,
      }}
    />
  );
}
