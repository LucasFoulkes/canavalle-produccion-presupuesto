import { VitePWA } from 'vite-plugin-pwa';
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from "path"
import tailwindcss from "@tailwindcss/vite"

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss(), VitePWA({
    registerType: 'autoUpdate',
    injectRegister: false,

    pwaAssets: {
      disabled: false,
      config: true,
    },

    manifest: {
      name: 'Cananvalle Producción',
      short_name: 'Cananvalle',
      description: 'Aplicación de presupuesto y producción de Cananvalle',
      theme_color: '#f3f4f6',
      background_color: '#f3f4f6',
      display: 'standalone',
      orientation: 'portrait',
      icons: [
        {
          src: '/icons/pwa-192x192.png',
          sizes: '192x192',
          type: 'image/png'
        },
        {
          src: '/icons/pwa-512x512.png',
          sizes: '512x512',
          type: 'image/png'
        },
        {
          src: '/icons/pwa-512x512.png',
          sizes: '512x512',
          type: 'image/png',
          purpose: 'maskable'
        }
      ]
    },

    workbox: {
      globPatterns: ['**/*.{js,css,html,svg,png,ico}'],
      cleanupOutdatedCaches: true,
      clientsClaim: true,
    },

    devOptions: {
      enabled: false,
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


