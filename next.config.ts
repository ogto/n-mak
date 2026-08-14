import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "developers.kakao.com",
        pathname: "/tool/resource/static/img/button/login/**",
      },
    ],
  },
};

export default nextConfig;
