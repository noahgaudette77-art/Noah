import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  base: './',
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['icons/*.png', 'icons/*.svg'],
      manifest: {
        name: 'Tempo — Iron Room',
        short_name: 'Tempo',
        description: 'A 12-month dumbbell program in a 1974 iron gym.',
        theme_color: '#0D0B09',
        background_color: '#0D0B09',
        display: 'standalone',
        orientation: 'portrait',
        start_url: './',
        scope: './',
        icons: [
          { src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'icons/icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        // precache the app shell, fonts, textures, phone-size rooms, posters and sounds (small, needed offline)
        globPatterns: ['**/*.{js,css,html,woff2,svg}', 'icons/*.png', 'assets/tex/*', 'assets/room/*-2k.webp', 'assets/art/*.{webp,avif}', 'assets/audio/*.mp3'],
        globIgnores: ['**/node_modules/**'],
        maximumFileSizeToCacheInBytes: 3 * 1024 * 1024,
        navigateFallback: 'index.html',
        runtimeCaching: [
          // MuscleWiki terms: their videos are never stored, and neither is anything from our token Worker
          { urlPattern: ({ url }) => url.hostname === 'api.musclewiki.com' || url.pathname.startsWith('/mw/'), handler: 'NetworkOnly' },
          // heavy room assets: cached on first use, so a second visit and the gym are offline-ready
          { urlPattern: ({ url }) => /\/assets\/(room\/.*-4k\.webp|art\/.*\.(mp4|webm)|props\/.*\.glb|ph\/.*)$/.test(url.pathname), handler: 'CacheFirst', options: { cacheName: 'room-heavy', expiration: { maxEntries: 60 } } },
        ],
      },
    }),
  ],
  build: { chunkSizeWarningLimit: 800 },
  test: { environment: 'node', include: ['tests/**/*.test.ts'] },
} as any);
