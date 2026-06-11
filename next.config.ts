import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    serverActions: {
      bodySizeLimit: '4mb'
    },
    allowedDevOrigins: ['192.168.1.105', 'shiny-ways-build.loca.lt']
  }
};

export default nextConfig;
