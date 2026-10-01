import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg', 'apple-touch-icon.png', 'icons/*.png'],
      manifest: {
        name: 'Academia+ | Treino & Nutrição',
        short_name: 'Academia+',
        description: 'Acompanhamento minimalista e intuitivo de treinos e nutrição offline-first.',
        theme_color: '#ffffff',
        background_color: '#f8fafc',
        display: 'standalone',
        orientation: 'portrait',
        start_url: '/',
        icons: [
          {
            src: '/pwa-192x192.svg',
            sizes: '192x192',
            type: 'image/svg+xml',
            purpose: 'any'
          },
          {
            src: '/pwa-512x512.svg',
            sizes: '512x512',
            type: 'image/svg+xml',
            purpose: 'any'
          },
          {
            src: '/pwa-512x512.svg',
            sizes: '512x512',
            type: 'image/svg+xml',
            purpose: 'maskable'
          }
        ],
        shortcuts: [
          {
            name: '+500ml de Água',
            short_name: '+Água',
            description: 'Adicionar 500ml de água rapidamente',
            url: '/?tab=nutricao&action=quick_water'
          },
          {
            name: '+1 Scoop de Whey',
            short_name: '+Whey',
            description: 'Registrar 1 dose de whey (+20g prot)',
            url: '/?tab=nutricao&action=quick_whey'
          },
          {
            name: '+1 Copo de Leite',
            short_name: '+Leite',
            description: 'Registrar 1 copo de leite (+6g prot)',
            url: '/?tab=nutricao&action=quick_milk'
          },
          {
            name: '+1 Besteira / Escape',
            short_name: '+Escape',
            description: 'Registrar escape na dieta (+600 kcal)',
            url: '/?tab=nutricao&action=quick_escape'
          },
          {
            name: 'Treino de Hoje',
            short_name: 'Treino',
            description: 'Acompanhar o treino de hoje',
            url: '/?tab=treino'
          }
        ]
      },
      workbox: {
        skipWaiting: true,
        clientsClaim: true,
        globPatterns: ['**/*.{js,css,html,svg,png,ico,woff,woff2}'],
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'google-fonts-cache',
              expiration: {
                maxEntries: 10,
                maxAgeSeconds: 60 * 60 * 24 * 365 // 1 year
              },
              cacheableResponse: {
                statuses: [0, 200]
              }
            }
          }
        ]
      }
    })
  ]
})
