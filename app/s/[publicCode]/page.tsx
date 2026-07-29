import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Storefront } from "../../components/Storefront";
import { getStoreByPublicCode } from "../../../lib/stores";

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

  return <Storefront store={store} />;
}
