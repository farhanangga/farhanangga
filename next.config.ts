import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  experimental: {
    agentFeedback: true,
    serverActions: {
      bodySizeLimit: "55mb",
    },
  },
  cacheComponents: true,
  partialPrefetching: true,
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
  images: {
    // kualitas yang boleh dipakai di <Image quality={...}>: 30 = latar buram, 75 = bawaan, 95 = foto utama galeri
    qualities: [30, 75, 95],
    remotePatterns: [
      {
        protocol: "https",
        hostname: "htwmnuvjjyfgvizyjozx.supabase.co",
        pathname: "/storage/v1/object/public/**",
      },
    ],
  },
};

export default nextConfig;