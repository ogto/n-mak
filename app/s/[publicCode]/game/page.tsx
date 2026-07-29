import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { FishingGame } from "../../../components/FishingGame";
import { getStoreByPublicCode } from "../../../../lib/stores";

type GamePageProps = {
  params: Promise<{ publicCode: string }>;
};

export async function generateMetadata({ params }: GamePageProps): Promise<Metadata> {
  const { publicCode } = await params;
  const store = await getStoreByPublicCode(publicCode);

  return {
    title: store ? `행운의 대어잡기 | ${store.displayName}` : "매장을 찾을 수 없습니다",
    description: "타이밍을 맞춰 물고기를 낚고 오늘의 행운 보상을 받아보세요.",
  };
}

export default async function GamePage({ params }: GamePageProps) {
  const { publicCode } = await params;
  const store = await getStoreByPublicCode(publicCode);

  if (!store) notFound();

  return <FishingGame store={store} />;
}
