import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Prevent Turbopack from tracing filesystem operations in these packages
  serverExternalPackages: ["@/data/plugin"],
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "res.cloudinary.com",
      },
    ],
  },
};

export default nextConfig;
