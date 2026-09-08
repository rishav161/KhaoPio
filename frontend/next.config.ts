import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  devIndicators: false,
  experimental: {
    optimizePackageImports: ['lucide-react', 'recharts'],
  },
};

export default nextConfig;
