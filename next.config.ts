import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Uploads can be large; allow generous body size for server actions / route handlers.
  experimental: {
    serverActions: {
      bodySizeLimit: "100mb",
    },
  },
};

export default nextConfig;
