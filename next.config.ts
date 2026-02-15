import type { NextConfig } from "next";
import withPWAInit from "@ducanh2912/next-pwa";

const withPWA = withPWAInit({
  dest: "public",
  disable: process.env.NODE_ENV === "development",
  workboxOptions: {
    disableDevLogs: true,
    skipWaiting: true,
    clientsClaim: true,
    // Don't use navigation fallback for auth-sensitive pages
    navigateFallbackDenylist: [
      /^\/pracownik/,
      /^\/admin/,
      /^\/api\//,
      /^\/auth\//,
      /^\/strefa-pacjenta\/login/,
    ],
    runtimeCaching: [
      // Auth API routes: always go to network, never cache
      {
        urlPattern: /^https?:\/\/.*\/api\/auth\/.*/i,
        handler: 'NetworkOnly',
      },
      // Supabase auth endpoints: never cache
      {
        urlPattern: /^https?:\/\/.*supabase.*\/auth\/.*/i,
        handler: 'NetworkOnly',
      },
      // Login/pracownik/admin page navigations: network first, no cache
      {
        urlPattern: /^https?:\/\/.*\/(pracownik|admin)(\/.*)?$/i,
        handler: 'NetworkFirst',
        options: {
          cacheName: 'staff-pages',
          expiration: {
            maxEntries: 16,
            maxAgeSeconds: 60, // 1 minute max cache
          },
          networkTimeoutSeconds: 5,
        },
      },
    ],
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
