const path = require('path');
const { execSync } = require('node:child_process');
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

function readLocalGitSha() {
  try {
    return execSync('git rev-parse --short=12 HEAD', {
      cwd: __dirname,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
    }).trim();
  } catch {
    return '';
  }
}

const localGitSha = readLocalGitSha();

const rawDeploymentId =
  process.env.NEXT_PUBLIC_BUILD_VERSION ||
  process.env.VERCEL_GIT_COMMIT_SHA ||
  process.env.VERCEL_DEPLOYMENT_ID ||
  localGitSha ||
  `pkg-${process.env.npm_package_version || '1.0.0'}`;

const deploymentId =
  rawDeploymentId.replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 32) ||
  `pkg-${process.env.npm_package_version || '1.0.0'}`;

module.exports = (phase) => {
  const isDevelopmentServer = phase === PHASE_DEVELOPMENT_SERVER;
  const shouldUseLocalClerkClientMock =
    process.env.DEV_AUTH_BYPASS?.trim().toLowerCase() === 'true';

  /** @type {import('next').NextConfig} */
  return {
    distDir: isDevelopmentServer ? '.next-dev' : '.next',
    env: {
      NEXT_PUBLIC_BUILD_VERSION: deploymentId,
    },
    generateBuildId: async () => deploymentId,
    images: {
      formats: ['image/avif', 'image/webp'],
      remotePatterns: remoteHosts.map((hostname) => ({
        protocol: 'https',
        hostname,
      })),
    },
    staticPageGenerationTimeout: 300,
    async headers() {
      return [
        {
          source: '/sw.js',
          headers: [
            {
              key: 'Cache-Control',
              value: 'no-store, no-cache, must-revalidate, proxy-revalidate',
            },
          ],
        },
      ];
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
