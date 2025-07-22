import { useState, useEffect } from 'react'
import { db } from '@/lib/dexie'
import { triggerSync } from '@/lib/init-sync'

/**
 * Custom hook for handling offline data access
 * This hook will try to fetch data from the network first,
 * and fall back to IndexedDB if offline
 */
export function useOfflineData<T>(
    tableName: string,
    networkFetchFn?: () => Promise<T[]>,
    options: {
        autoSync?: boolean;
        syncInterval?: number;
        filterFn?: (item: any) => boolean;
    } = {}
) {
    const [data, setData] = useState<T[]>([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<Error | null>(null)
    const [isOfflineData, setIsOfflineData] = useState(false)

    const { autoSync = true, syncInterval = 60000, filterFn } = options

    // Function to load data
    const loadData = async (forceNetwork = false) => {
        setLoading(true)
        setError(null)

        try {
            // Try to get data from network if we're online and have a network fetch function
            if (navigator.onLine && networkFetchFn && (forceNetwork || autoSync)) {
                try {
                    const networkData = await networkFetchFn()
                    setData(filterFn ? networkData.filter(filterFn) : networkData)
                    setIsOfflineData(false)
                    return
                } catch (err) {
                    console.warn(`Failed to fetch ${tableName} from network, falling back to offline data`, err)
                    // Fall back to offline data
                }
            }

            // Get data from IndexedDB
            if (db.tables.some(table => table.name === tableName)) {
                const offlineData = await db.table(tableName).toArray()
                setData(filterFn ? offlineData.filter(filterFn) : offlineData)
                setIsOfflineData(true)
            } else {
                console.warn(`Table ${tableName} not found in IndexedDB schema`)
                setData([])
                setIsOfflineData(true)
            }
        } catch (err) {
            console.error(`Error loading ${tableName} data:`, err)
            setError(err instanceof Error ? err : new Error(String(err)))
            setData([])
        } finally {
            setLoading(false)
        }
    }

    // Function to refresh data
    const refreshData = () => loadData(true)

    // Set up periodic sync if enabled
    useEffect(() => {
        loadData()

        // Set up periodic sync if online and autoSync is enabled
        let syncTimer: number | undefined

        if (autoSync && syncInterval > 0) {
            syncTimer = window.setInterval(() => {
                if (navigator.onLine) {
                    loadData(true)
                }
            }, syncInterval)
        }

        // Set up online/offline event listeners
        const handleOnline = () => {
            console.log(`Network restored, refreshing ${tableName} data`)
            loadData(true)
        }

        window.addEventListener('online', handleOnline)

        return () => {
            if (syncTimer) clearInterval(syncTimer)
            window.removeEventListener('online', handleOnline)
        }
    }, [tableName, autoSync, syncInterval])

    return {
        data,
        loading,
        error,
        isOfflineData,
        refreshData,
        syncData: triggerSync
    }
}