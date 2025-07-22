import { useState } from 'react'
import { db } from '@/lib/dexie'
import { outboxService } from '@/lib/outbox'
import { v4 as uuidv4 } from 'uuid'

/**
 * Hook for handling offline-first form operations
 */
export function useOfflineForm<T extends { id?: number | string }>(tableName: string) {
    const [saving, setSaving] = useState(false)
    const [error, setError] = useState<Error | null>(null)

    /**
     * Save data with offline support
     */
    async function saveData(data: T): Promise<T> {
        setSaving(true)
        setError(null)

        try {
            // Generate a temporary ID if none provided
            const isNew = !data.id
            if (isNew) {
                data.id = `temp_${uuidv4()}`
            }

            // Always save to local DB first
            await db.table(tableName).put(data)

            // Add to outbox for sync
            const operation = isNew ? 'create' : 'update'
            await outboxService.addToOutbox(tableName, operation, data)

            return data
        } catch (err) {
            const error = err instanceof Error ? err : new Error(String(err))
            setError(error)
            throw error
        } finally {
            setSaving(false)
        }
    }

    /**
     * Delete data with offline support
     */
    async function deleteData(id: number | string): Promise<void> {
        setSaving(true)
        setError(null)

        try {
            // Get the data before deleting (for the outbox)
            const data = await db.table(tableName).get(id)

            if (!data) {
                throw new Error(`Record with ID ${id} not found`)
            }

            // Delete from local DB
            await db.table(tableName).delete(id)

            // Add to outbox for sync
            await outboxService.addToOutbox(tableName, 'delete', data)
        } catch (err) {
            const error = err instanceof Error ? err : new Error(String(err))
            setError(error)
            throw error
        } finally {
            setSaving(false)
        }
    }

    return {
        saving,
        error,
        saveData,
        deleteData
    }
}