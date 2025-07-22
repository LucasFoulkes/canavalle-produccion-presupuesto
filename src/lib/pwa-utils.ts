// Utility functions for PWA functionality

/**
 * Checks if the app is running as an installed PWA
 * This is useful for iOS Safari where PWA behavior is different
 */
interface SafariNavigator extends Navigator {
    standalone?: boolean;
}

export const isRunningAsPWA = (): boolean => {
    // iOS Safari when running as PWA
    if ((window.navigator as SafariNavigator).standalone) {
        return true
    }

    // Chrome, Edge, etc. when running as PWA
    if (window.matchMedia('(display-mode: standalone)').matches) {
        return true
    }

    // Not running as PWA
    return false
}

/**
 * Checks if the browser supports service workers
 */
export const supportsServiceWorker = (): boolean => {
    return 'serviceWorker' in navigator
}

/**
 * Checks if the app is ready for offline use
 * (has service worker and cache)
 */
export const checkOfflineReady = async (): Promise<boolean> => {
    if (!supportsServiceWorker()) {
        return false
    }

    try {
        // Check if we have a service worker
        const registration = await navigator.serviceWorker.getRegistration()
        if (!registration) {
            return false
        }

        // Check if we have cached the main page
        if ('caches' in window) {
            const cacheNames = await caches.keys()
            if (cacheNames.length === 0) {
                return false
            }

            // Check if index.html is cached
            const cache = await caches.open(cacheNames[0])
            const cachedIndex = await cache.match('/')
            return !!cachedIndex
        }

        return true
    } catch (error) {
        console.error('Error checking offline readiness:', error)
        return false
    }
}

/**
 * Prompts the user to install the PWA
 * This only works in browsers that support the beforeinstallprompt event
 */
export const installPWA = async (): Promise<void> => {
    // We need to get the deferredPrompt from somewhere
    // This would typically be stored when the beforeinstallprompt event fires
    const deferredPrompt = (window as any).deferredPrompt

    if (!deferredPrompt) {
        console.log('No installation prompt available')
        return
    }

    // Show the install prompt
    deferredPrompt.prompt()

    // Wait for the user to respond to the prompt
    const choiceResult = await deferredPrompt.userChoice
    console.log('User installation choice:', choiceResult.outcome)

    // Clear the deferredPrompt
    delete (window as any).deferredPrompt
}