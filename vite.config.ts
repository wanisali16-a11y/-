import react from '@vitejs/plugin-react';
import path from 'path';
import { defineConfig } from 'vite';

export default defineConfig(async () => {
  let tailwindPlugin = null;
  try {
    const tailwindModule = await import('@tailwindcss/vite');
    tailwindPlugin = tailwindModule.default();
  } catch (e) {
    // Fallback if tailwind plugin missing locally before install
  }

  let pwaPlugin = null;
  try {
    const { VitePWA } = await import('vite-plugin-pwa');
    pwaPlugin = VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.ico', 'apple-touch-icon.png', 'icon.svg'],
      manifest: {
        id: '/',
        name: 'منظومة مبيعات الساحل',
        short_name: 'منظومة مبيعات',
        description: 'منظومة مبيعات مبسطة للمواد الغذائية مع آلة حاسبة',
        theme_color: '#2563eb',
        background_color: '#ffffff',
        display: 'standalone',
        start_url: '/',
        scope: '/',
        icons: [
          {
            src: '/pwa-192x192.png',
            sizes: '192x192',
            type: 'image/png',
            purpose: 'any',
          },
          {
            src: '/pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any',
          },
          {
            src: '/pwa-maskable-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
        ],
      },
      devOptions: {
        enabled: false,
      },
    });
  } catch (e) {
    // Fallback if PWA plugin missing locally
  }

  return {
    plugins: [
      react(), 
      ...(tailwindPlugin ? [tailwindPlugin] : []),
      ...(pwaPlugin ? [pwaPlugin] : [])
    ],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modifyâfile watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
      // Disable file watching when DISABLE_HMR is true to save CPU during agent edits.
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});
