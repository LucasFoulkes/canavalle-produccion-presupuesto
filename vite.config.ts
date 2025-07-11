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
      name: 'boilerplate-vite-pwa-typescript-shadcn-tanstackrouter',
      short_name: 'boilerplate-vite-pwa-typescript-shadcn-tanstackrouter',
      description: 'boilerplate-vite-pwa-typescript-shadcn-tanstackrouter',
      theme_color: '#ffffff',
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
