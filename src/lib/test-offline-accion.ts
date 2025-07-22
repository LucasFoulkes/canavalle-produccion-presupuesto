import { db } from './dexie'
import { offlineAccionService } from '@/services/offline-accion.service'

/**
 * Test function to verify offline action functionality
 */
export const testOfflineAction = async (camaId: number): Promise<void> => {
    console.log('=== Testing Offline Action Functionality ===')

    try {
        // 1. Save a test action locally
        const actionType = 'produccion_real'
        const value = Math.floor(Math.random() * 100) // Random value for testing

        console.log(`Saving test action: ${actionType} = ${value} for cama ${camaId}`)
        await offlineAccionService.createAccionForCama(camaId, actionType, value)

        // 2. Verify it was saved locally
        const localValues = await offlineAccionService.getTodaysValuesByCama(camaId)
        console.log('Local values after save:', localValues)

        // 3. Check the outbox
        const outboxItems = await db.outbox.toArray()
        console.log(`Outbox items: ${outboxItems.length}`)
        outboxItems.forEach((item, index) => {
            console.log(`Item ${index + 1}:`, {
                table: item.table,
                operation: item.operation,
                status: item.status,
                data: item.data ? `${actionType}: ${item.data[actionType]}` : 'No data'
            })
        })

        console.log('=== Offline Action Test Complete ===')
    } catch (error) {
        console.error('Offline action test failed:', error)
    }
}

// Export a function to manually trigger the test
export const runOfflineActionTest = (camaId: number): void => {
    testOfflineAction(camaId).catch(console.error)
}