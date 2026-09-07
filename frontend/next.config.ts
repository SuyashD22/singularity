import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Allow any device on the local network to access dev resources
  allowedDevOrigins: [
    "10.*",            // 10.x.x.x private range
    "192.168.*",       // 192.168.x.x private range
    "172.*",           // 172.x.x.x private range
    "localhost",
    "*.loca.lt",
  ],
  images: {
    formats: ["image/avif", "image/webp"],
  },
  async redirects() {
    return [
      {
        source: "/CountDown",
        destination: "/countdown",
        permanent: false,
      },
      {
        source: "/countdown-launch",
        destination: "/launch-countdown",
        permanent: false,
      },
    ];
  },
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
        ],
      },
    ];
  },
};

export default nextConfig;

