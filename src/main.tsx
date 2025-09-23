import { StrictMode } from 'react'
import ReactDOM from 'react-dom/client'
import { RouterProvider, createRouter } from '@tanstack/react-router'
import { registerSW } from 'virtual:pwa-register'
import './index.css'
// Import the generated route tree
import { routeTree } from './routeTree.gen'
import { initDexieSchema } from '@/lib/dexie'
import { syncAllTables, pushPendingObservations, pushPendingPinches, pushPendingProduccion, pushPendingPuntosGps, pushPendingUsuarios } from '@/services/sync'
import { NotFound } from '@/components/not-found'
import { AuthProvider } from '@/hooks/use-auth'

// Create a new router instance
const router = createRouter({ routeTree, defaultNotFoundComponent: NotFound })

// Register the router instance for type safety
declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router
  }
}

const registerServiceWorker = () => {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator)) return
  registerSW({ immediate: true })
}

const wireOnlineSync = () => {
  if (typeof window === 'undefined') return
  const handleOnline = () => {
    // First push any offline-created observations, then refresh pulls
    Promise.all([
      pushPendingObservations(),
      pushPendingPinches(),
      pushPendingProduccion(),
      pushPendingPuntosGps(),
      pushPendingUsuarios(),
    ])
      .catch((error) => console.warn('[push] online push failed', error))
      .finally(() => {
        syncAllTables().catch((error) => {
          console.warn('[sync] online refresh failed', error)
        })
      })
  }
  window.addEventListener('online', handleOnline)
}

// Render the app and initialize local cache
const rootElement = document.getElementById('root')!
const root = ReactDOM.createRoot(rootElement)
root.render(
  <StrictMode>
    <AuthProvider>
      <RouterProvider router={router} />
    </AuthProvider>
  </StrictMode>,
)

registerServiceWorker()
wireOnlineSync()

  // Fire-and-forget: initialize Dexie and kick off background sync
  ; (async () => {
    try {
      await initDexieSchema()
      // Try to push pending local changes, then kick off a background pull
      pushPendingObservations().catch(() => { })
      pushPendingPinches().catch(() => { })
      pushPendingProduccion().catch(() => { })
      pushPendingPuntosGps().catch(() => { })
      pushPendingUsuarios().catch(() => { })
      syncAllTables().catch(() => { })
    } catch (e) {
      // Dexie might not be available (e.g., private mode); ignore
      console.warn('[dexie] init/sync skipped:', e)
    }
  })()
