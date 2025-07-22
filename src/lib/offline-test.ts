// Simple offline functionality test
import { db } from './dexie'

export const testOfflineCapabilities = async (): Promise<void> => {
    console.log('=== Testing Offline Capabilities ===')

    try {
        // Test IndexedDB
        console.log('Testing IndexedDB...')
        const testData = { id: 999, nombre: 'Test Finca' }
        await db.fincas.put(testData)
        const retrieved = await db.fincas.get(999)
        console.log('IndexedDB test:', retrieved ? 'PASSED' : 'FAILED')

        // Clean up test data
        await db.fincas.delete(999)

        // Test service worker
        console.log('Testing Service Worker...')
        if ('serviceWorker' in navigator) {
            const registration = await navigator.serviceWorker.getRegistration()
            console.log('Service Worker registration:', registration ? 'FOUND' : 'NOT FOUND')

            if (registration) {
                console.log('SW state:', registration.active?.state)
                console.log('SW scope:', registration.scope)
            }
        } else {
            console.log('Service Worker: NOT SUPPORTED')
        }

        // Test cache API
        console.log('Testing Cache API...')
        if ('caches' in window) {
            const cacheNames = await caches.keys()
            console.log('Available caches:', cacheNames)

            // Test if our app files are cached
            const appCache = await caches.open('workbox-precache-v2-/')
            const cachedRequests = await appCache.keys()
            console.log('Cached requests count:', cachedRequests.length)
        } else {
            console.log('Cache API: NOT SUPPORTED')
        }

        // Test network status
        console.log('Network status:', navigator.onLine ? 'ONLINE' : 'OFFLINE')

        console.log('=== Offline Test Complete ===')

    } catch (error) {
        console.error('Offline test failed:', error)
    }
}

// Auto-run test in development
if (import.meta.env.DEV) {
    setTimeout(testOfflineCapabilities, 2000)
}