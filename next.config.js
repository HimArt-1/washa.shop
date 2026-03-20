const path = require('path');
const { PHASE_DEVELOPMENT_SERVER } = require('next/constants');

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

module.exports = (phase) => {
  const isDevelopmentServer = phase === PHASE_DEVELOPMENT_SERVER;
  const shouldUseLocalClerkClientMock =
    process.env.DEV_AUTH_BYPASS?.trim().toLowerCase() === 'true';

  /** @type {import('next').NextConfig} */
  return {
    distDir: isDevelopmentServer ? '.next-dev' : '.next',
    images: {
      formats: ['image/avif', 'image/webp'],
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
    webpack: (config) => {
      if (shouldUseLocalClerkClientMock) {
        config.resolve.alias = {
          ...(config.resolve.alias || {}),
          '@clerk/nextjs$': path.resolve(__dirname, 'src/lib/clerk-dev/client.tsx'),
        };
      }

      return config;
    },
  };
};
