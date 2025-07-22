import { useState, useEffect } from 'react'
import { triggerSync } from '@/lib/init-sync'
import { checkOfflineReady, isRunningAsPWA } from '@/lib/pwa-utils'

export function OfflineIndicator() {
    const [isOnline, setIsOnline] = useState(navigator.onLine)
    const [swRegistered, setSwRegistered] = useState(false)
    const [syncing, setSyncing] = useState(false)
    const [isPWA, setIsPWA] = useState(false)
    const [offlineReady, setOfflineReady] = useState(false)
    const [showDetails, setShowDetails] = useState(false)

    useEffect(() => {
        // Check if running as PWA
        setIsPWA(isRunningAsPWA())

        // Check if offline ready
        checkOfflineReady().then(ready => {
            setOfflineReady(ready)
        })

        const handleOnline = () => {
            setIsOnline(true)
            // Try to sync data when we come back online
            setSyncing(true)
            triggerSync()
                .then(() => {
                    console.log('Data synced after coming online')
                })
                .catch(err => {
                    console.error('Failed to sync after coming online:', err)
                })
                .finally(() => {
                    setTimeout(() => {
                        setSyncing(false)
                    }, 2000) // Show syncing message for at least 2 seconds
                })
        }

        const handleOffline = () => setIsOnline(false)

        window.addEventListener('online', handleOnline)
        window.addEventListener('offline', handleOffline)

        // Check service worker registration
        if ('serviceWorker' in navigator) {
            navigator.serviceWorker.getRegistration().then(registration => {
                setSwRegistered(!!registration)
            })

            // Listen for service worker updates
            navigator.serviceWorker.addEventListener('controllerchange', () => {
                console.log('Service worker controller changed')
                checkOfflineReady().then(ready => {
                    setOfflineReady(ready)
                })
            })
        }

        return () => {
            window.removeEventListener('online', handleOnline)
            window.removeEventListener('offline', handleOffline)
        }
    }, [])

    // Force sync data
    const handleForceSync = () => {
        if (isOnline) {
            setSyncing(true)
            triggerSync()
                .then(() => {
                    console.log('Data synced manually')
                })
                .catch(err => {
                    console.error('Failed to sync manually:', err)
                })
                .finally(() => {
                    setTimeout(() => {
                        setSyncing(false)
                    }, 1000)
                })
        }
    }

    // If everything is perfect, don't show anything
    if (isOnline && swRegistered && !syncing && offlineReady && isPWA) return null

    return (
        <div
            className={`fixed top-0 left-0 right-0 text-white text-center py-2 text-sm z-50 ${!isOnline ? 'bg-yellow-500' :
                    !swRegistered ? 'bg-red-500' :
                        !offlineReady ? 'bg-orange-500' :
                            syncing ? 'bg-blue-500' :
                                !isPWA ? 'bg-purple-500' : 'bg-green-500'
                }`}
            onClick={() => setShowDetails(!showDetails)}
        >
            <div className="cursor-pointer">
                {!isOnline && "📱 Modo sin conexión - Los datos se sincronizarán cuando vuelva la conexión"}
                {isOnline && !swRegistered && "⚠️ PWA no registrada - Algunas funciones offline pueden no estar disponibles"}
                {isOnline && swRegistered && !offlineReady && "⚠️ Preparando modo offline - Por favor espere..."}
                {isOnline && swRegistered && offlineReady && !isPWA && "💡 Instale como app para mejor experiencia offline"}
                {isOnline && swRegistered && syncing && "🔄 Sincronizando datos..."}
                {showDetails && <span className="ml-2 text-xs">▼ Detalles</span>}
                {!showDetails && <span className="ml-2 text-xs">▶ Detalles</span>}
            </div>

            {showDetails && (
                <div className="bg-white text-gray-800 p-3 text-left text-xs mt-1">
                    <div className="flex justify-between items-center mb-2">
                        <h4 className="font-bold">Estado de la aplicación</h4>
                        {isOnline && <button
                            onClick={handleForceSync}
                            className="bg-blue-500 text-white px-2 py-1 rounded text-xs"
                            disabled={syncing}
                        >
                            {syncing ? 'Sincronizando...' : 'Sincronizar datos'}
                        </button>}
                    </div>
                    <ul className="space-y-1">
                        <li>• Conexión: {isOnline ? '✅ En línea' : '❌ Sin conexión'}</li>
                        <li>• Service Worker: {swRegistered ? '✅ Registrado' : '❌ No registrado'}</li>
                        <li>• Datos offline: {offlineReady ? '✅ Disponibles' : '❌ No disponibles'}</li>
                        <li>• Instalada como app: {isPWA ? '✅ Sí' : '❌ No'}</li>
                    </ul>
                    {!isPWA && isOnline && (
                        <div className="mt-2 text-xs">
                            <p>Para instalar como app:</p>
                            <p>• iOS: Toque el botón compartir y seleccione "Añadir a pantalla de inicio"</p>
                            <p>• Android: Toque el menú y seleccione "Instalar aplicación"</p>
                        </div>
                    )}
                </div>
            )}
        </div>
    )
}