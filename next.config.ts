import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Prevent Turbopack from tracing filesystem operations in these packages
  serverExternalPackages: ["@/data/plugin"],
};

export default nextConfig;
