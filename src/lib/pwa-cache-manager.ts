/**
 * PWA Cache Management Utilities
 * Helps with managing service worker caches and ensuring updates are applied
 */

export class PWACacheManager {
    /**
     * Clear all caches except the current one
     */
    static async clearOldCaches(): Promise<void> {
        if ('caches' in window) {
            try {
                const cacheNames = await caches.keys();
                const currentCacheName = await this.getCurrentCacheName();

                const deletePromises = cacheNames
                    .filter(name => name !== currentCacheName)
                    .map(name => {
                        console.log('Deleting old cache:', name);
                        return caches.delete(name);
                    });

                await Promise.all(deletePromises);
                console.log('Old caches cleared successfully');
            } catch (error) {
                console.error('Error clearing old caches:', error);
            }
        }
    }

    /**
     * Get the current cache name from the service worker
     */
    private static async getCurrentCacheName(): Promise<string | null> {
        if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
            return new Promise((resolve) => {
                navigator.serviceWorker.addEventListener('message', (event) => {
                    if (event.data && event.data.type === 'CACHE_NAME') {
                        resolve(event.data.cacheName);
                    }
                });

                // Request cache name from service worker
                navigator.serviceWorker.controller?.postMessage({
                    type: 'GET_CACHE_NAME'
                });

                // Fallback timeout
                setTimeout(() => resolve(null), 1000);
            });
        }
        return null;
    }

    /**
     * Force refresh all cached resources
     */
    static async forceRefreshCache(): Promise<void> {
        if ('caches' in window) {
            try {
                const cacheNames = await caches.keys();

                // Delete all caches to force fresh downloads
                await Promise.all(cacheNames.map(name => caches.delete(name)));

                console.log('All caches cleared, forcing fresh downloads');

                // Reload the page to trigger fresh downloads
                window.location.reload();
            } catch (error) {
                console.error('Error force refreshing cache:', error);
            }
        }
    }

    /**
     * Check if updates are being blocked by cache
     */
    static async checkCacheHealth(): Promise<{
        hasStaleCache: boolean;
        cacheCount: number;
        oldCaches: string[];
    }> {
        if (!('caches' in window)) {
            return { hasStaleCache: false, cacheCount: 0, oldCaches: [] };
        }

        try {
            const cacheNames = await caches.keys();
            const currentCacheName = await this.getCurrentCacheName();

            const oldCaches = cacheNames.filter(name =>
                name !== currentCacheName &&
                (name.includes('workbox') || name.includes('pwa'))
            );

            return {
                hasStaleCache: oldCaches.length > 0,
                cacheCount: cacheNames.length,
                oldCaches
            };
        } catch (error) {
            console.error('Error checking cache health:', error);
            return { hasStaleCache: false, cacheCount: 0, oldCaches: [] };
        }
    }
}
