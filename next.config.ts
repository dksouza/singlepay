import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  experimental: {
    serverActions: {
      bodySizeLimit: '50mb',
      allowedOrigins: ['app.singlepay.com.br', '*.singlepay.com.br', 'localhost:3000']
    }
  } as any,
  async headers() {
    return [
      {
        source: "/upsell.js",
        headers: [
          {
            key: "Cache-Control",
            value: "no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
