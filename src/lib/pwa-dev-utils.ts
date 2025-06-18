/**
 * PWA Development Utilities
 * Only available in development mode
 */

export class PWADevUtils {
    static isDevelopment = import.meta.env.DEV;

    /**
     * Log PWA status information
     */
    static logPWAStatus(): void {
        if (!this.isDevelopment) return;

        console.group('🔧 PWA Development Status');

        // Service Worker status
        if ('serviceWorker' in navigator) {
            console.log('✅ Service Worker supported');
            navigator.serviceWorker.getRegistrations().then(registrations => {
                console.log(`📋 Active registrations: ${registrations.length}`);
                registrations.forEach((reg, index) => {
                    console.log(`  ${index + 1}. Scope: ${reg.scope}`);
                    console.log(`     Active: ${!!reg.active}`);
                    console.log(`     Installing: ${!!reg.installing}`);
                    console.log(`     Waiting: ${!!reg.waiting}`);
                });
            });
        } else {
            console.log('❌ Service Worker not supported');
        }

        // Cache status
        if ('caches' in window) {
            console.log('✅ Cache API supported');
            caches.keys().then(cacheNames => {
                console.log(`📦 Active caches: ${cacheNames.length}`);
                cacheNames.forEach(name => {
                    console.log(`  - ${name}`);
                });
            });
        } else {
            console.log('❌ Cache API not supported');
        }

        // PWA installation status
        const isStandalone = window.matchMedia('(display-mode: standalone)').matches;
        const isInWebAppiOS = (window.navigator as any).standalone === true;
        const isInWebAppChrome = window.matchMedia('(display-mode: standalone)').matches;

        console.log(`📱 PWA Status:`);
        console.log(`  Standalone: ${isStandalone}`);
        console.log(`  iOS Web App: ${isInWebAppiOS}`);
        console.log(`  Chrome Web App: ${isInWebAppChrome}`);

        console.groupEnd();
    }

    /**
     * Force service worker update
     */
    static async forceServiceWorkerUpdate(): Promise<void> {
        if (!this.isDevelopment) return;

        console.log('🔄 Forcing service worker update...');

        if ('serviceWorker' in navigator) {
            const registrations = await navigator.serviceWorker.getRegistrations();

            for (const registration of registrations) {
                console.log(`Updating registration: ${registration.scope}`);
                await registration.update();
            }

            console.log('✅ Service worker update forced');
        }
    }

    /**
     * Clear all PWA data
     */
    static async clearAllPWAData(): Promise<void> {
        if (!this.isDevelopment) return;

        console.log('🧹 Clearing all PWA data...');

        try {
            // Clear all caches
            if ('caches' in window) {
                const cacheNames = await caches.keys();
                await Promise.all(cacheNames.map(name => caches.delete(name)));
                console.log(`✅ Cleared ${cacheNames.length} caches`);
            }

            // Unregister all service workers
            if ('serviceWorker' in navigator) {
                const registrations = await navigator.serviceWorker.getRegistrations();
                await Promise.all(registrations.map(reg => reg.unregister()));
                console.log(`✅ Unregistered ${registrations.length} service workers`);
            }

            // Clear localStorage (optional)
            const clearStorage = confirm('Also clear localStorage?');
            if (clearStorage) {
                localStorage.clear();
                console.log('✅ Cleared localStorage');
            }

            console.log('🎉 PWA data cleared successfully');
        } catch (error) {
            console.error('❌ Error clearing PWA data:', error);
        }
    }

    /**
     * Add development console commands
     */
    static addDevConsoleCommands(): void {
        if (!this.isDevelopment) return;

        // Add global utility functions for development
        (window as any).pwaDevUtils = {
            status: () => this.logPWAStatus(),
            forceUpdate: () => this.forceServiceWorkerUpdate(),
            clearAll: () => this.clearAllPWAData(),
            help: () => {
                console.log(`
🔧 PWA Development Utilities:
  pwaDevUtils.status() - Show PWA status
  pwaDevUtils.forceUpdate() - Force service worker update
  pwaDevUtils.clearAll() - Clear all PWA data
  pwaDevUtils.help() - Show this help
        `);
            }
        };

        console.log('🔧 PWA dev utils loaded. Type "pwaDevUtils.help()" for commands.');
    }
}

// Auto-initialize in development
if (PWADevUtils.isDevelopment) {
    PWADevUtils.addDevConsoleCommands();
    PWADevUtils.logPWAStatus();
}
