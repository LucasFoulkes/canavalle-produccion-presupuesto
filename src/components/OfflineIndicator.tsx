import { useState, useEffect } from 'react'

export function OfflineIndicator() {
    const [isOnline, setIsOnline] = useState(navigator.onLine)
    const [swRegistered, setSwRegistered] = useState(false)

    useEffect(() => {
        const handleOnline = () => setIsOnline(true)
        const handleOffline = () => setIsOnline(false)

        window.addEventListener('online', handleOnline)
        window.addEventListener('offline', handleOffline)

        // Check service worker registration
        if ('serviceWorker' in navigator) {
            navigator.serviceWorker.getRegistration().then(registration => {
                setSwRegistered(!!registration)
            })
        }

        return () => {
            window.removeEventListener('online', handleOnline)
            window.removeEventListener('offline', handleOffline)
        }
    }, [])

    if (isOnline && swRegistered) return null

    return (
        <div className="fixed top-0 left-0 right-0 bg-yellow-500 text-white text-center py-2 text-sm z-50">
            {!isOnline && "📱 Modo sin conexión"}
            {isOnline && !swRegistered && "⚠️ PWA no registrada"}
        </div>
    )
}