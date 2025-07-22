// Comprehensive offline functionality test
import { db } from './dexie'
import { isRunningAsPWA, supportsServiceWorker } from './pwa-utils'

export const testOfflineCapabilities = async (): Promise<Record<string, boolean | string | number>> => {
    console.log('=== Testing Offline Capabilities ===')
    const results: Record<string, boolean | string | number> = {}

    try {
        // Test IndexedDB
        console.log('Testing IndexedDB...')
        try {
            const testData = { id: 999, nombre: 'Test Finca' }
            await db.fincas.put(testData)
            const retrieved = await db.fincas.get(999)
            results.indexedDB = !!retrieved
            console.log('IndexedDB test:', results.indexedDB ? 'PASSED' : 'FAILED')

            // Clean up test data
            await db.fincas.delete(999)
        } catch (err) {
            results.indexedDB = false
            console.error('IndexedDB test failed:', err)
        }

        // Test service worker
        console.log('Testing Service Worker...')
        if (supportsServiceWorker()) {
            try {
                const registration = await navigator.serviceWorker.getRegistration()
                results.serviceWorkerRegistered = !!registration
                console.log('Service Worker registration:', registration ? 'FOUND' : 'NOT FOUND')

                if (registration) {
                    results.serviceWorkerState = registration.active?.state || 'unknown'
                    results.serviceWorkerScope = registration.scope
                    console.log('SW state:', results.serviceWorkerState)
                    console.log('SW scope:', results.serviceWorkerScope)
                }
            } catch (err) {
                results.serviceWorkerRegistered = false
                console.error('Service Worker test failed:', err)
            }
        } else {
            results.serviceWorkerSupported = false
            console.log('Service Worker: NOT SUPPORTED')
        }

        // Test cache API
        console.log('Testing Cache API...')
        if ('caches' in window) {
            try {
                const cacheNames = await caches.keys()
                results.cachesAvailable = cacheNames.length > 0
                console.log('Available caches:', cacheNames)

                // Check for workbox cache
                const workboxCache = cacheNames.find(name => name.startsWith('workbox-precache'))
                if (workboxCache) {
                    const appCache = await caches.open(workboxCache)
                    const cachedRequests = await appCache.keys()
                    results.cachedRequestsCount = cachedRequests.length
                    console.log('Cached requests count:', cachedRequests.length)

                    // Check if index.html is cached
                    const indexCached = await appCache.match('/index.html') || await appCache.match('/')
                    results.indexHtmlCached = !!indexCached
                    console.log('Index.html cached:', results.indexHtmlCached ? 'YES' : 'NO')

                    // Check if offline.html is cached
                    const offlineCached = await appCache.match('/offline.html')
                    results.offlineHtmlCached = !!offlineCached
                    console.log('Offline.html cached:', results.offlineHtmlCached ? 'YES' : 'NO')
                } else {
                    results.workboxCacheFound = false
                    console.log('Workbox cache not found')
                }
            } catch (err) {
                results.cacheTestFailed = true
                console.error('Cache API test failed:', err)
            }
        } else {
            results.cacheApiSupported = false
            console.log('Cache API: NOT SUPPORTED')
        }

        // Test network status
        results.isOnline = navigator.onLine
        console.log('Network status:', results.isOnline ? 'ONLINE' : 'OFFLINE')

        // Test if running as PWA
        results.isRunningAsPWA = isRunningAsPWA()
        console.log('Running as PWA:', results.isRunningAsPWA ? 'YES' : 'NO')

        // Overall assessment
        const criticalFeatures = [
            results.indexedDB,
            results.serviceWorkerRegistered,
            results.cachesAvailable
        ]

        results.offlineReady = criticalFeatures.every(Boolean)
        console.log('OVERALL OFFLINE READINESS:', results.offlineReady ? 'READY' : 'NOT READY')

        console.log('=== Offline Test Complete ===')
        console.log('Detailed results:', results)

        return results
    } catch (error) {
        console.error('Offline test failed:', error)
        return { error: String(error) }
    }
}

// Auto-run test in development
if (import.meta.env.DEV) {
    setTimeout(testOfflineCapabilities, 2000)
}