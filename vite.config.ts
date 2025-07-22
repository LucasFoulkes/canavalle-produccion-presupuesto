import { VitePWA } from 'vite-plugin-pwa';
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from "path"
import tailwindcss from "@tailwindcss/vite"
import { tanstackRouter } from '@tanstack/router-plugin/vite'


// https://vitejs.dev/config/
export default defineConfig({
  plugins: [tailwindcss(),
  tanstackRouter({
    target: 'react',
    autoCodeSplitting: true,
  }),
  react(),
  VitePWA({
    registerType: 'autoUpdate',
    injectRegister: 'auto',
    strategies: 'generateSW',

    pwaAssets: {
      disabled: false,
      config: true,
    },

    manifest: {
      name: 'Canavalle Producción',
      short_name: 'Canavalle',
      description: 'Sistema de gestión de producción agrícola',
      theme_color: '#ffffff',
      background_color: '#ffffff',
      display: 'standalone',
      orientation: 'portrait',
      scope: '/',
      start_url: '/',
      icons: [
        {
          src: 'pwa-192x192.png',
          sizes: '192x192',
          type: 'image/png'
        },
        {
          src: 'pwa-512x512.png',
          sizes: '512x512',
          type: 'image/png'
        },
        {
          src: 'maskable-icon-512x512.png',
          sizes: '512x512',
          type: 'image/png',
          purpose: 'maskable'
        }
      ]
    },

    workbox: {
      globPatterns: ['**/*.{js,css,html,svg,png,ico,woff,woff2}'],
      cleanupOutdatedCaches: true,
      clientsClaim: true,
      skipWaiting: true,
      navigateFallback: '/offline.html',
      navigateFallbackDenylist: [/^\/api\//],

      // Make sure to precache these critical files
      globDirectory: 'dist',
      globIgnores: ['**/node_modules/**/*'],

      // Add additional runtime caching rules
      runtimeCaching: [
        {
          urlPattern: /^https:\/\/.*\.supabase\.co\/.*$/,
          handler: 'NetworkFirst',
          options: {
            cacheName: 'supabase-api',
            expiration: {
              maxEntries: 100,
              maxAgeSeconds: 60 * 60 * 24 // 24 hours
            },
            networkTimeoutSeconds: 10,
            backgroundSync: {
              name: 'supabase-queue',
              options: {
                maxRetentionTime: 24 * 60 // Retry for up to 24 hours (specified in minutes)
              }
            }
          }
        },
        {
          urlPattern: /\.(?:png|jpg|jpeg|svg|gif|webp)$/,
          handler: 'CacheFirst',
          options: {
            cacheName: 'images-cache',
            expiration: {
              maxEntries: 50,
              maxAgeSeconds: 60 * 60 * 24 * 30 // 30 days
            }
          }
        },
        {
          urlPattern: /^https:\/\/fonts\.googleapis\.com/,
          handler: 'StaleWhileRevalidate',
          options: {
            cacheName: 'google-fonts-stylesheets',
          }
        },
        {
          urlPattern: /^https:\/\/fonts\.gstatic\.com/,
          handler: 'CacheFirst',
          options: {
            cacheName: 'google-fonts-webfonts',
            expiration: {
              maxEntries: 30,
              maxAgeSeconds: 60 * 60 * 24 * 365 // 1 year
            }
          }
        },
        {
          // Cache all app routes
          urlPattern: ({ url }) => url.pathname.startsWith('/app'),
          handler: 'StaleWhileRevalidate',
          options: {
            cacheName: 'app-pages',
            expiration: {
              maxEntries: 50,
              maxAgeSeconds: 60 * 60 * 24 // 24 hours
            }
          }
        },
        {
          // Cache all navigation requests
          urlPattern: ({ request }) => request.mode === 'navigate',
          handler: 'NetworkFirst',
          options: {
            cacheName: 'navigation-cache',
            expiration: {
              maxEntries: 50,
              maxAgeSeconds: 60 * 60 * 24 // 24 hours
            },
            networkTimeoutSeconds: 3
          }
        },
        {
          // Cache all JavaScript and CSS files
          urlPattern: /\.(?:js|css)$/,
          handler: 'StaleWhileRevalidate',
          options: {
            cacheName: 'static-resources',
            expiration: {
              maxEntries: 100,
              maxAgeSeconds: 60 * 60 * 24 * 7 // 7 days
            }
          }
        }
      ]
    },

    devOptions: {
      enabled: true,
      navigateFallback: 'index.html',
      suppressWarnings: true,
      type: 'module',
    },
  })],

  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
})
