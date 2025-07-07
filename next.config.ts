
import type {NextConfig} from 'next';
import withPWAInit from "@ducanh2912/next-pwa";

const withPWA = withPWAInit({
  dest: "public",
  register: true,
  skipWaiting: true,
  disable: false,
  cacheOnFrontEndNav: true,
  fallbacks: {
    document: "/offline",
  },
  manifest: {
    name: 'LeadTrack Pro',
    short_name: 'LeadTrack Pro',
    description: 'A sales lead tracking and management application.',
    scope: '/',
    start_url: '/',
    display: 'standalone',
    background_color: '#FFFCF5',
    theme_color: '#f5b814',
    icons: [
      {
        src: '/nib%20tera%20sales.png',
        sizes: '192x192',
        type: 'image/png',
        purpose: 'any maskable',
      },
      {
        src: '/nib%20tera%20sales.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'any maskable',
      },
    ],
  },
});

const nextConfig: NextConfig = {
  /* config options here */
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
};

export default withPWA(nextConfig);
