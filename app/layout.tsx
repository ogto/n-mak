import type { Metadata } from "next";
import { headers } from "next/headers";
import "./globals.css";

export async function generateMetadata(): Promise<Metadata> {
  const requestHeaders = await headers();
  const host = requestHeaders.get("host") ?? "localhost:3000";
  const protocol = host.includes("localhost") ? "http" : "https";

  return {
    metadataBase: new URL(`${protocol}://${host}`),
    title: "파도상회 | 오늘 바다, 오늘 한 접시",
    description: "게임으로 즐기고, 쿠폰과 포인트로 다시 찾는 파도상회 멤버십",
    openGraph: {
      title: "파도상회",
      description: "게임으로 즐기고, 혜택으로 다시 만나요",
      images: [{ url: "/og.png", width: 1664, height: 936, alt: "파도상회 멤버십" }],
    },
    twitter: {
      card: "summary_large_image",
      title: "파도상회",
      description: "게임으로 즐기고, 혜택으로 다시 만나요",
      images: ["/og.png"],
    },
  };
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko">
      <body>{children}</body>
    </html>
  );
}
