import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Tell Next.js bundler these packages are Node.js-only — never bundle them
  // for the browser. mongoose uses `async_hooks`, `net`, `tls`, etc.
  serverExternalPackages: ["mongoose", "mongodb"],
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
