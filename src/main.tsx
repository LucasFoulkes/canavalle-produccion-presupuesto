import { StrictMode } from 'react'
import ReactDOM from 'react-dom/client'
import { RouterProvider, createRouter } from '@tanstack/react-router'
import './index.css'
// Import the generated route tree
import { routeTree } from './routeTree.gen'
import { initDexieSchema } from '@/lib/dexie'
import { syncAllTables } from '@/services/sync'

// Create a new router instance
const router = createRouter({ routeTree })

// Register the router instance for type safety
declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router
  }
}

// Render the app and initialize local cache
const rootElement = document.getElementById('root')!
if (!rootElement.innerHTML) {
  const root = ReactDOM.createRoot(rootElement)
  root.render(
    <StrictMode>
      <RouterProvider router={router} />
    </StrictMode>,
  )

    // Fire-and-forget: initialize Dexie and kick off background sync
    ; (async () => {
      try {
        await initDexieSchema()
        // background sync; don't await to avoid blocking UI
        syncAllTables().catch(() => { })
      } catch (e) {
        // Dexie might not be available (e.g., private mode); ignore
        console.warn('[dexie] init/sync skipped:', e)
      }
    })()
}