import type { NextConfig } from "next";
import withPWAInit from "@ducanh2912/next-pwa";

const withPWA = withPWAInit({
  dest: "public",
  cacheOnFrontEndNav: false, // Changed from true
  aggressiveFrontEndNavCaching: false, // Changed from true
  reloadOnOnline: true,
  disable: true, // FORCE DISABLE PWA
  workboxOptions: {
    disableDevLogs: true,
  },
});

// Force Deploy Timestamp: 2025-12-31 21:42

const nextConfig: NextConfig = {
  images: {
    dangerouslyAllowSVG: true,
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
      },
      {
        protocol: 'https',
        hostname: 'placehold.co',
      },
      {
        protocol: 'https',
        hostname: '*.githubusercontent.com', // Covers raw and objects
      },
    ],
  },
};

export default withPWA(nextConfig);
