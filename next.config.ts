import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /** Historias con fotos en base64 (como Express 18mb). */
  experimental: {
    serverActions: {
      bodySizeLimit: "20mb",
    },
  },
  /** API-only por ahora; sin optimización de imágenes de producto. */
  async headers() {
    return [
      {
        source: "/api/:path*",
        headers: [
          { key: "Access-Control-Allow-Origin", value: "*" },
          { key: "Access-Control-Allow-Methods", value: "GET, POST, PUT, PATCH, DELETE, OPTIONS" },
          {
            key: "Access-Control-Allow-Headers",
            value: "Content-Type, Authorization",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
