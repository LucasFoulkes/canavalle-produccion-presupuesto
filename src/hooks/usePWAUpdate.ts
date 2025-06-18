import { useState, useEffect } from 'react';
import { registerSW } from 'virtual:pwa-register';
import { PWACacheManager } from '@/lib/pwa-cache-manager';

export function usePWAUpdate() {
    const [needRefresh, setNeedRefresh] = useState(false);
    const [offlineReady, setOfflineReady] = useState(false);
    const [updateAvailable, setUpdateAvailable] = useState(false);
    const [updateSW, setUpdateSW] = useState<((reloadPage?: boolean) => Promise<void>) | null>(null);

    useEffect(() => {
        const updateServiceWorker = registerSW({
            onRegistered(r) {
                console.log('SW registered: ', r);
                // Check for updates periodically
                if (r) {
                    setInterval(() => {
                        console.log('Checking for SW update');
                        r.update();
                    }, 60000); // Check every minute
                }
            },
            onRegisterError(error) {
                console.log('SW registration error', error);
            },
            onNeedRefresh() {
                console.log('SW needs refresh - new version available');
                setNeedRefresh(true);
                setUpdateAvailable(true);
            },
            onOfflineReady() {
                console.log('SW offline ready');
                setOfflineReady(true);
            },
        });

        setUpdateSW(() => updateServiceWorker);

        // Check cache health on initialization
        PWACacheManager.checkCacheHealth().then(health => {
            if (health.hasStaleCache) {
                console.log('Stale caches detected:', health.oldCaches);
                PWACacheManager.clearOldCaches();
            }
        });
    }, []);

    const updateApp = async () => {
        if (updateSW) {
            try {
                console.log('Updating PWA...');

                // Clear old caches before updating
                await PWACacheManager.clearOldCaches();

                // Update service worker
                await updateSW(true);

                // Clear states
                setNeedRefresh(false);
                setUpdateAvailable(false);

                // Small delay to ensure service worker is updated
                setTimeout(() => {
                    console.log('Reloading page after PWA update');
                    window.location.reload();
                }, 500);

            } catch (error) {
                console.error('Error updating app:', error);
                // If update fails, try force refresh
                console.log('Attempting force refresh...');
                await PWACacheManager.forceRefreshCache();
            }
        }
    };

    const dismissUpdate = () => {
        setNeedRefresh(false);
        setUpdateAvailable(false);
    };

    const forceUpdate = async () => {
        console.log('Force updating PWA...');
        await PWACacheManager.forceRefreshCache();
    };

    return {
        needRefresh,
        offlineReady,
        updateAvailable,
        updateApp,
        dismissUpdate,
        forceUpdate,
    };
}
