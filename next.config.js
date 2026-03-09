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
  buildExcludes: [
    /middleware-manifest\.json$/,
    /middleware-runtime\.js$/,
    /middleware-runtime\.js\.map$/,
    /pages-manifest\.json$/,
    /package\.json$/,
    /app-build-manifest\.json$/,
    /build-manifest\.json$/,
    /ssg-manifest\.json$/,
    /server\/app-paths-manifest\.json$/,
    /server\/pages-manifest\.json$/,
    /server\/client-reference-manifest\.js$/,
    /server\/middleware-manifest\.json$/,
    /page_client-reference-manifest\.js$/,
  ],
});

module.exports = withPWA(nextConfig);
