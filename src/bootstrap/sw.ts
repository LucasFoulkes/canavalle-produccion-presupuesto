export function registerServiceWorker(): void {
    if (!('serviceWorker' in navigator)) return
    if (!import.meta.env.PROD) {
        // Only register SW in production builds to avoid MIME issues in dev
        return
    }
    window.addEventListener('load', async () => {
        try {
            const registration = await navigator.serviceWorker.register('/sw.js', { scope: '/' })
            console.log('SW registered: ', registration)
            registration.addEventListener('updatefound', () => {
                const newWorker = registration.installing
                if (newWorker) {
                    newWorker.addEventListener('statechange', () => {
                        if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                            console.log('New content is available; please refresh.')
                        }
                    })
                }
            })
        } catch (registrationError) {
            console.log('SW registration failed: ', registrationError)
        }
    })
}


