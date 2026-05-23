import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "**.mypinata.cloud",
      },
      {
        protocol: "https",
        hostname: "ipfs.io",
      },
      {
        protocol: "https",
        hostname: "**.infura.io",
      },
      {
        protocol: "https",
        hostname: "**.alchemy.com",
      },
      {
        protocol: "https",
        hostname: "**.moralis.io",
      },
    ],
  },
};

export default nextConfig;
