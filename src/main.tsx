import './index.css'
import { StrictMode } from 'react'
import ReactDOM from 'react-dom/client'
import { RouterProvider, createRouter } from '@tanstack/react-router'

// Import the generated route tree
import { routeTree } from './routeTree.gen'
import { initializeSync } from './lib/init-sync'
// @ts-ignore
import { registerSW } from 'virtual:pwa-register'
import './lib/offline-test'

// Create a new router instance
const router = createRouter({ routeTree })

// Register the router instance for type safety
declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router
  }
}

// Initialize data sync
initializeSync().catch(console.error)

// Register service worker for PWA functionality
if (typeof registerSW === 'function') {
  registerSW({
    onNeedRefresh() {
      console.log('New content available, please refresh.')
    },
    onOfflineReady() {
      console.log('App ready to work offline')
    },
  })
}

// Render the app
const rootElement = document.getElementById('root')!
if (!rootElement.innerHTML) {
  const root = ReactDOM.createRoot(rootElement)
  root.render(
    <StrictMode>
      <RouterProvider router={router} />
    </StrictMode>,
  )
}