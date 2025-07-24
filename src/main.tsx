import { StrictMode } from 'react'
import ReactDOM from 'react-dom/client'
import { RouterProvider, createRouter } from '@tanstack/react-router'
import './index.css'
import { db } from '@/lib/dexie'

// Import the generated route tree
import { routeTree } from './routeTree.gen'

// Create a new router instance
const router = createRouter({ routeTree })

// Register the router instance for type safety
declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router
  }
}

// Console log the current Dexie database state and sync all data
async function initializeDatabase() {
  try {
    console.log('=== Database Initialization ===')
    console.log('Tables:', db.tables.map(table => table.name))
    console.log('Navigator online:', navigator.onLine)

    // Check all table counts
    const [usuarios, fincas, bloques, camas] = await Promise.all([
      db.usuarios.toArray(),
      db.fincas.toArray(),
      db.bloques.toArray(),
      db.camas.toArray()
    ])

    console.log('Local data:', {
      usuarios: usuarios.length,
      fincas: fincas.length,
      bloques: bloques.length,
      camas: camas.length
    })

    // If online, sync all data from Supabase
    if (navigator.onLine) {
      console.log('Syncing data from server...')
      const { syncService } = await import('@/services/sync.service')
      await syncService.syncAllData()

      // Log updated counts
      const [updatedUsuarios, updatedFincas, updatedBloques, updatedCamas] = await Promise.all([
        db.usuarios.toArray(),
        db.fincas.toArray(),
        db.bloques.toArray(),
        db.camas.toArray()
      ])

      console.log('Synced data:', {
        usuarios: updatedUsuarios.length,
        fincas: updatedFincas.length,
        bloques: updatedBloques.length,
        camas: updatedCamas.length
      })
    } else {
      console.log('Offline mode - using local data only')
    }
  } catch (error) {
    console.error('Error initializing database:', error)
  }
}

// Call the initialization function
initializeDatabase()

// Register service worker for PWA - iOS compatible
if ('serviceWorker' in navigator) {
  window.addEventListener('load', async () => {
    try {
      const registration = await navigator.serviceWorker.register('/sw.js', {
        scope: '/'
      });

      console.log('SW registered: ', registration);

      // Handle updates
      registration.addEventListener('updatefound', () => {
        const newWorker = registration.installing;
        if (newWorker) {
          newWorker.addEventListener('statechange', () => {
            if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
              console.log('New content is available; please refresh.');
            }
          });
        }
      });

    } catch (registrationError) {
      console.log('SW registration failed: ', registrationError);
    }
  });
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