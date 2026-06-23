import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "**",
      },
      {
        protocol: "http",
        hostname: "**",
      },
    ],
    minimumCacheTTL: 31536000, // 1 year
  },
  logging: {
    fetches: {
      fullUrl: false,
      hmrRefreshes: false,
    },
  },
  // mongoose uses async_hooks, net, tls etc. — must stay server-only
  serverExternalPackages: ["mongoose", "mongodb"],
  compiler: {
    removeConsole:
      process.env.NODE_ENV === "production"
        ? { exclude: ["error", "warn"] }
        : false,
  },
  devIndicators: false,
};

export default nextConfig;
