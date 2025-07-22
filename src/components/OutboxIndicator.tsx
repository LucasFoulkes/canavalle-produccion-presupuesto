import { useState, useEffect } from 'react'
import { outboxService, processOutbox } from '@/lib/outbox'

/**
 * Component that shows pending outbox items and allows manual sync
 */
export function OutboxIndicator() {
    const [pendingCount, setPendingCount] = useState(0)
    const [syncing, setSyncing] = useState(false)
    const [expanded, setExpanded] = useState(false)

    // Load pending count on mount and periodically
    useEffect(() => {
        loadPendingCount()

        const interval = setInterval(loadPendingCount, 10000)
        return () => clearInterval(interval)
    }, [])

    // Load pending count
    async function loadPendingCount() {
        try {
            const count = await outboxService.getPendingCount()
            setPendingCount(count)
        } catch (err) {
            console.error('Error loading pending count:', err)
        }
    }

    // Handle manual sync
    async function handleSync() {
        if (!navigator.onLine || syncing) return

        setSyncing(true)
        try {
            await processOutbox()
            await loadPendingCount()
        } catch (err) {
            console.error('Error processing outbox:', err)
        } finally {
            setSyncing(false)
        }
    }

    // Don't show if no pending items
    if (pendingCount === 0) return null

    return (
        <div className="fixed bottom-4 right-4 z-50">
            <div
                className={`bg-blue-500 text-white rounded-lg shadow-lg overflow-hidden ${expanded ? 'w-64' : 'w-auto'
                    }`}
            >
                <div
                    className="flex items-center justify-between p-3 cursor-pointer"
                    onClick={() => setExpanded(!expanded)}
                >
                    <div className="flex items-center">
                        <span className="mr-2">🔄</span>
                        <span>{pendingCount} {pendingCount === 1 ? 'cambio' : 'cambios'} pendiente{pendingCount !== 1 ? 's' : ''}</span>
                    </div>
                    <span>{expanded ? '▼' : '▶'}</span>
                </div>

                {expanded && (
                    <div className="p-3 border-t border-blue-400 bg-blue-600">
                        <p className="text-sm mb-3">
                            {navigator.onLine
                                ? 'Hay cambios pendientes de sincronización.'
                                : 'Sin conexión. Los cambios se sincronizarán cuando vuelva la conexión.'}
                        </p>
                        <button
                            className={`w-full py-2 px-4 rounded ${navigator.onLine && !syncing
                                    ? 'bg-white text-blue-500 hover:bg-blue-50'
                                    : 'bg-blue-300 text-blue-700 cursor-not-allowed'
                                }`}
                            onClick={handleSync}
                            disabled={!navigator.onLine || syncing}
                        >
                            {syncing ? 'Sincronizando...' : 'Sincronizar ahora'}
                        </button>
                    </div>
                )}
            </div>
        </div>
    )
}