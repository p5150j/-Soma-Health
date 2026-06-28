import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ['@boundaryml/baml'],
  turbopack: {},
};

export default nextConfig;
