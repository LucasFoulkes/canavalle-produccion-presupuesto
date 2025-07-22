import { syncService } from '@/services/sync.service'

// Function to check if we're online
const isOnline = (): boolean => {
    return navigator.onLine
}

// Function to sync all data at startup
export const initializeSync = async (): Promise<void> => {
    console.log('Initializing application sync...')

    if (isOnline()) {
        console.log('Online: Starting full data sync')
        try {
            await syncService.syncAllData()
            console.log('Initial sync completed successfully')
        } catch (error) {
            console.error('Error during initial sync:', error)
            console.log('Continuing with offline data')
        }
    } else {
        console.log('Offline: Using local data only')
    }

    // Set up listeners for online/offline events
    window.addEventListener('online', () => {
        console.log('Connection restored: Starting sync')
        syncService.syncAllData().catch(console.error)
    })

    window.addEventListener('offline', () => {
        console.log('Connection lost: Operating in offline mode')
    })
}

// Export a function to manually trigger sync
export const triggerSync = async (): Promise<void> => {
    if (isOnline()) {
        console.log('Manually triggering sync...')
        try {
            await syncService.syncAllData()
            console.log('Manual sync completed successfully')
        } catch (error) {
            console.error('Error during manual sync:', error)
        }
    } else {
        console.log('Cannot sync: Device is offline')
    }
}