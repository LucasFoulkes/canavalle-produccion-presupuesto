import { VitePWA } from 'vite-plugin-pwa';
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from "path"
import tailwindcss from "@tailwindcss/vite"

export default defineConfig({
  plugins: [react(), tailwindcss(), VitePWA({
    registerType: 'autoUpdate',
    injectRegister: false,

    pwaAssets: {
      disabled: false,
      config: true,
    },

    manifest: {
      name: 'cananvalle-produccion-presupuesto',
      short_name: 'cananvalle-produccion-presupuesto',
      description: 'cananvalle-produccion-presupuesto',
      // theme_color: '#ffffff',
      theme_color: '#f4f4f5', // bg-zinc-100
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