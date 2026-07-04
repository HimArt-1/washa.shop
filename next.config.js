const path = require('path');
const { execSync } = require('node:child_process');
const crypto = require('node:crypto');
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

function readLocalDirtyBuildSuffix() {
  try {
    const relevantPaths = [
      'package.json',
      'package-lock.json',
      'next.config.js',
      'public',
      'src',
      'washa-dtf-studio/src',
      'washa-dtf-studio/dist',
      'supabase/migrations',
    ].join(' ');
    const execOptions = {
      cwd: __dirname,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
      maxBuffer: 20 * 1024 * 1024,
    };
    const trackedStatus = execSync('git status --porcelain --untracked-files=no', execOptions).trim();
    const diffRaw = execSync(`git diff --no-ext-diff --raw HEAD -- ${relevantPaths}`, execOptions);
    const untrackedFiles = execSync(`git ls-files --others --exclude-standard -- ${relevantPaths}`, execOptions);
    const status = [trackedStatus, untrackedFiles.trim()].filter(Boolean).join('\n');
    if (!status) return '';

    const fingerprint = crypto
      .createHash('sha256')
      .update(status)
      .update(diffRaw)
      .update(untrackedFiles)
      .digest('hex')
      .slice(0, 10);

    return `dirty-${fingerprint}`;
  } catch {
    return '';
  }
}

const localGitSha = readLocalGitSha();
const localDirtyBuildSuffix = readLocalDirtyBuildSuffix();

const rawDeploymentId =
  process.env.NEXT_PUBLIC_BUILD_VERSION ||
  process.env.VERCEL_GIT_COMMIT_SHA ||
  process.env.VERCEL_DEPLOYMENT_ID ||
  (localGitSha && localDirtyBuildSuffix ? `${localGitSha}-${localDirtyBuildSuffix}` : '') ||
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
    outputFileTracingRoot: __dirname,
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
    /** روابط قديمة تشير إلى .png — الملف الفعلي SVG */
    async rewrites() {
      return [
        {
          source: '/images/design/heavy-tshirt-black-front.png',
          destination: '/images/design/heavy-tshirt-black-front.svg',
        },
      ];
    },
    async redirects() {
      return [
        {
          source: '/design/washa-studio',
          destination: '/design',
          permanent: true,
        },
      ];
    },
    async headers() {
      return [
        {
          source: '/dashboard/:path*',
          headers: [
            {
              key: 'Cache-Control',
              value: 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0',
            },
            {
              key: 'Pragma',
              value: 'no-cache',
            },
          ],
        },
        {
          source: '/account/:path*',
          headers: [
            {
              key: 'Cache-Control',
              value: 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0',
            },
            {
              key: 'Pragma',
              value: 'no-cache',
            },
          ],
        },
        {
          source: '/studio/:path*',
          headers: [
            {
              key: 'Cache-Control',
              value: 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0',
            },
            {
              key: 'Pragma',
              value: 'no-cache',
            },
          ],
        },
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
