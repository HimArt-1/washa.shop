/** @type {import('next').NextConfig} */
const supabaseHost = process.env.NEXT_PUBLIC_SUPABASE_URL
  ? new URL(process.env.NEXT_PUBLIC_SUPABASE_URL).hostname
  : '';

const remoteHosts = [
  'images.unsplash.com',
  'plus.unsplash.com',
  'placeholder.com',
  'img.clerk.com',
  'replicate.delivery',
  'pbxt.replicate.delivery',
  ...(supabaseHost ? [supabaseHost] : []),
];

const nextConfig = {
  images: {
    remotePatterns: remoteHosts.map((hostname) => ({
      protocol: 'https',
      hostname,
    })),
  },
  experimental: {
    serverActions: {
      bodySizeLimit: '10mb',
    },
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
};

const withPWA = require("@ducanh2912/next-pwa").default({
  dest: "public",
  register: true,
  skipWaiting: true,
  disable: process.env.NODE_ENV === "development",
});

module.exports = withPWA(nextConfig);
