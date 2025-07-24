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

// Console log the current Dexie database state
async function logDexieDatabase() {
  try {
    console.log('=== Dexie Database Info ===')
    console.log('Database name:', db.name)
    console.log('Database version:', db.verno)
    console.log('Tables:', db.tables.map(table => table.name))

    // Log usuarios table data
    const usuarios = await db.usuarios.toArray()
    console.log('Usuarios in database:', usuarios)
    console.log('Total usuarios count:', usuarios.length)

    // Log database size info
    if (navigator.storage && navigator.storage.estimate) {
      const estimate = await navigator.storage.estimate()
      console.log('Storage estimate:', estimate)
    }
  } catch (error) {
    console.error('Error accessing Dexie database:', error)
  }
}

// Call the logging function
logDexieDatabase()

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

// Handle offline/online events
window.addEventListener('online', () => {
  console.log('App is online');
});

window.addEventListener('offline', () => {
  console.log('App is offline');
});

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