import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "export",
  basePath: "/emissions_sources",
  assetPrefix: "/emissions_sources/",
  images: {
    unoptimized: true,
  },
};

export default nextConfig;
