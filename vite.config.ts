/// <reference types="vitest/config" />
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'

// GitHub Pages serves the project at https://<owner>.github.io/<repo>/.
// BASE_PATH can override it (e.g. "/" for a custom domain).
const base = process.env.BASE_PATH ?? '/kystjakten-spill/'

export default defineConfig({
  base,
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      injectRegister: false,
      includeAssets: ['favicon.svg', 'icons/apple-touch-icon.png', 'logo.svg'],
      manifest: {
        id: base,
        name: 'Fyrvakt – skipsjakt langs kysten',
        short_name: 'Fyrvakt',
        description:
          'Et kystspill på ekte AIS-data: finn riktig skip på radaren før tiden renner ut.',
        lang: 'nb',
        dir: 'ltr',
        start_url: base,
        scope: base,
        display: 'standalone',
        orientation: 'portrait',
        background_color: '#04111c',
        theme_color: '#04111c',
        categories: ['games', 'education', 'navigation'],
        icons: [
          { src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png' },
          {
            src: 'icons/icon-maskable-512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
          { src: 'favicon.svg', sizes: 'any', type: 'image/svg+xml' },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,woff2,webmanifest}'],
        // Norwegian only needs the latin subsets; others are fetched on demand if ever used.
        globIgnores: ['**/*{cyrillic,greek,vietnamese}*', '**/icon-maskable-512.png'],
        maximumFileSizeToCacheInBytes: 3 * 1024 * 1024,
        navigateFallback: `${base}index.html`,
        navigateFallbackDenylist: [/\/data\//],
        cleanupOutdatedCaches: true,
        runtimeCaching: [
          {
            // Live AIS snapshot: always try the network first, keep a short-lived copy for offline play.
            urlPattern: ({ url }) => url.pathname.endsWith('/data/ais.json'),
            handler: 'NetworkFirst',
            options: {
              cacheName: 'ais-snapshot',
              networkTimeoutSeconds: 8,
              expiration: { maxEntries: 2, maxAgeSeconds: 60 * 60 * 3 },
              cacheableResponse: { statuses: [200] },
            },
          },
          {
            urlPattern: ({ url }) =>
              url.hostname === 'tiles.openfreemap.org' && url.pathname.startsWith('/fonts/'),
            handler: 'CacheFirst',
            options: {
              cacheName: 'map-glyphs',
              expiration: { maxEntries: 60, maxAgeSeconds: 60 * 60 * 24 * 30 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
          {
            urlPattern: ({ url }) =>
              url.hostname === 'tiles.openfreemap.org' || url.hostname === 'cache.kartverket.no',
            handler: 'StaleWhileRevalidate',
            options: {
              cacheName: 'map-tiles',
              expiration: { maxEntries: 800, maxAgeSeconds: 60 * 60 * 24 * 14 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
        ],
      },
      devOptions: { enabled: false },
    }),
  ],
  build: {
    chunkSizeWarningLimit: 1200,
    rollupOptions: {
      output: {
        manualChunks: (id) => (id.includes('maplibre-gl') ? 'maplibre' : undefined),
      },
    },
  },
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
})
