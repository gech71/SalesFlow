
import type {NextConfig} from 'next';
import withPWAInit from "@ducanh2912/next-pwa";

const withPWA = withPWAInit({
  dest: "public",
  register: true,
  skipWaiting: true,
  fallbacks: {
    document: "/offline",
  },
  manifest: {
    name: 'LeadTrack Pro',
    short_name: 'LeadTrack Pro',
    description: 'A sales lead tracking and management application.',
    start_url: '/',
    display: 'standalone',
    background_color: '#2E9AFE',
    theme_color: '#2E9AFE',
    icons: [
      {
        src: '/nib tera sales.png',
        sizes: '192x192',
        type: 'image/png',
      },
      {
        src: '/nib tera sales.png',
        sizes: '512x512',
        type: 'image/png',
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
