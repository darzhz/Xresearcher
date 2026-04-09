import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      manifest: {
        name: 'ArXiv Local-Voice',
        short_name: 'ALV',
        description: 'Privacy-centric research summarizer with on-device AI',
        theme_color: '#1f2937',
        background_color: '#ffffff',
        display: 'standalone',
        scope: '/',
        start_url: '/',
        icons: [
          {
            src: '/icon-192.png',
            sizes: '192x192',
            type: 'image/png',
            purpose: 'any'
          },
          {
            src: '/icon-512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any'
          }
        ]
      },
      workbox: {
        cleanupOutdatedCaches: true,
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/ar5iv\.org\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'ar5iv-cache',
              expiration: { maxEntries: 50 }
            }
          },
          {
            urlPattern: /^https:\/\/export\.arxiv\.org\/api\/.*/i,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'arxiv-api-cache',
              networkTimeoutSeconds: 3,
              expiration: { maxEntries: 50, maxAgeSeconds: 3600 }
            }
          },
          {
            urlPattern: /^https:\/\/api\.allorigins\.win\/.*/i,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'cors-proxy-cache',
              networkTimeoutSeconds: 5,
              expiration: { maxEntries: 20, maxAgeSeconds: 3600 }
            }
          }
        ]
      }
    })
  ],
  server: {
    port: 5173,
    open: true
  }
})
