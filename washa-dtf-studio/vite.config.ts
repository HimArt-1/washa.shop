import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig, loadEnv} from 'vite';

function resolveClerkKeyEnvironment(key: string, publicKey: boolean) {
  if (key.startsWith(publicKey ? 'pk_live_' : 'sk_live_')) return 'production';
  if (key.startsWith(publicKey ? 'pk_test_' : 'sk_test_')) return 'development';
  return null;
}

export default defineConfig(({mode}) => {
  const rootEnv = loadEnv(mode, path.resolve(__dirname, '..'), '');
  const clerkPublishableKey =
    process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY ||
    rootEnv.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY ||
    '';
  const clerkSecretKey =
    process.env.CLERK_SECRET_KEY ||
    rootEnv.CLERK_SECRET_KEY ||
    '';
  const publishableEnvironment = resolveClerkKeyEnvironment(clerkPublishableKey, true);
  const secretEnvironment = resolveClerkKeyEnvironment(clerkSecretKey, false);

  if (mode === 'production' && (!publishableEnvironment || !secretEnvironment)) {
    throw new Error(
      'NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY and CLERK_SECRET_KEY are required for the WASHA AI production build.',
    );
  }

  if (
    publishableEnvironment
    && secretEnvironment
    && publishableEnvironment !== secretEnvironment
  ) {
    throw new Error('Clerk publishable and secret keys must belong to the same environment.');
  }

  if (
    process.env.VERCEL_ENV === 'production'
    && (publishableEnvironment !== 'production' || secretEnvironment !== 'production')
  ) {
    throw new Error('Vercel Production must build WASHA AI with Clerk production keys.');
  }

  return {
    base: '/design/washa-ai/app/',
    plugins: [react(), tailwindcss()],
    define: {
      'import.meta.env.VITE_CLERK_PUBLISHABLE_KEY': JSON.stringify(clerkPublishableKey),
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
      dedupe: ['react', 'react-dom'],
    },
    build: {
      rollupOptions: {
        input: {
          main: path.resolve(__dirname, 'index.html'),
          v4: path.resolve(__dirname, 'v4.html'),
        },
      },
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modifyâfile watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
    },
  };
});
