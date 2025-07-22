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

// Import outbox sync
import { initOutboxSync } from './lib/outbox'

// Initialize data sync
initializeSync().catch(console.error)

// Initialize outbox sync for offline operations
initOutboxSync()

// Register service worker for PWA functionality
if (typeof registerSW === 'function') {
  const updateSW = registerSW({
    immediate: true, // Register immediately
    onNeedRefresh() {
      console.log('New content available, updating...')
      // Auto update for better offline experience
      updateSW(true)

      // Alternatively, show a notification to the user
      /*
      const shouldUpdate = window.confirm('Nueva versión disponible. ¿Actualizar ahora?')
      if (shouldUpdate) {
        updateSW(true)
      }
      */
    },
    onOfflineReady() {
      console.log('App ready to work offline')
      // Show a toast notification
      const offlineToast = document.createElement('div')
      offlineToast.textContent = 'Aplicación lista para usar sin conexión'
      offlineToast.style.position = 'fixed'
      offlineToast.style.bottom = '20px'
      offlineToast.style.left = '50%'
      offlineToast.style.transform = 'translateX(-50%)'
      offlineToast.style.backgroundColor = '#4CAF50'
      offlineToast.style.color = 'white'
      offlineToast.style.padding = '10px 20px'
      offlineToast.style.borderRadius = '4px'
      offlineToast.style.zIndex = '9999'
      document.body.appendChild(offlineToast)

      // Remove the toast after 3 seconds
      setTimeout(() => {
        document.body.removeChild(offlineToast)
      }, 3000)

      // Ensure data is synced when offline ready
      import('./lib/init-sync').then(({ triggerSync }) => {
        if (navigator.onLine) {
          triggerSync().catch(console.error)
        }
      })
    },
    onRegistered(registration: ServiceWorkerRegistration | undefined) {
      console.log('Service Worker registered')

      // Force update check on registration
      if (registration) {
        setInterval(() => {
          registration.update().catch(console.error)
        }, 60 * 60 * 1000) // Check for updates every hour
      }

      // Check if we're online and sync data if needed
      if (navigator.onLine) {
        console.log('Online on SW registration, ensuring data is synced')
        import('./lib/init-sync').then(({ triggerSync }) => {
          triggerSync().catch(console.error)
        })
      }
    },
    onRegisterError(error: Error) {
      console.error('SW registration error', error)
    }
  })

  // Handle service worker messages
  navigator.serviceWorker.addEventListener('message', (event) => {
    if (event.data && event.data.type === 'OFFLINE_READY') {
      console.log('Received offline ready message from SW')
    }
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