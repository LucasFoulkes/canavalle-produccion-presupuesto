import { db } from '@/lib/dexie'
import { outboxService } from '@/lib/outbox'
import { Accion } from '@/types/database'

// Extended Accion type that allows string indexing for dynamic property access
interface AccionWithDynamicProps extends Accion {
    [key: string]: any;
}

/**
 * Service for handling offline-first action operations
 * This service extends the functionality of accionService to support offline operations
 */
export const offlineAccionService = {
    /**
     * Create a new accion for a specific cama with offline support
     * This will store the action locally and queue it for synchronization
     */
    async createAccionForCama(camaId: number, actionType: string, value: number): Promise<void> {
        try {
            // Get the local cama details
            const localCama = await db.camas.get(camaId)
            if (!localCama) {
                throw new Error('Cama not found in local database')
            }

            // Check if there's already a local entry for today for this cama
            const today = new Date()
            const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate())
            const endOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 23, 59, 59, 999)

            // Find existing local action for today
            const existingActions = await db.acciones
                .where('cama_id')
                .equals(camaId)
                .and(item => {
                    const itemDate = new Date(item.created_at)
                    return itemDate >= startOfDay && itemDate <= endOfDay
                })
                .toArray()

            let localAccion: AccionWithDynamicProps

            if (existingActions.length > 0) {
                // Update existing entry for today
                localAccion = existingActions[0]
                localAccion[actionType] = value

                // Update in local DB
                await db.acciones.update(localAccion.id, { [actionType]: value })

                // Add to outbox for sync
                await outboxService.addToOutbox('acciones', 'update', {
                    ...localAccion,
                    local_cama_id: camaId, // Add local cama ID for reference
                })
            } else {
                // Create new entry for today
                const newAccion: Partial<Accion> = {
                    id: Date.now(), // Temporary ID for local storage
                    cama_id: camaId,
                    created_at: new Date().toISOString(),
                    [actionType]: value
                }

                // Save to local DB
                await db.acciones.add(newAccion as Accion)

                // Add to outbox for sync
                await outboxService.addToOutbox('acciones', 'create', {
                    ...newAccion,
                    local_cama_id: camaId, // Add local cama ID for reference
                })
            }

            console.log(`Successfully saved ${actionType}: ${value} for cama ${camaId} locally`)
        } catch (error) {
            console.error('Error creating accion locally:', error)
            throw error
        }
    },

    /**
     * Get today's values for a specific cama from local database
     */
    async getTodaysValuesByCama(camaId: number): Promise<Record<string, number>> {
        try {
            // Get today's date range
            const today = new Date()
            const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate())
            const endOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 23, 59, 59, 999)

            // Find existing local action for today
            const existingActions = await db.acciones
                .where('cama_id')
                .equals(camaId)
                .and(item => {
                    const itemDate = new Date(item.created_at)
                    return itemDate >= startOfDay && itemDate <= endOfDay
                })
                .toArray()

            if (existingActions.length === 0) {
                return {}
            }

            // Extract non-null values from the most recent action
            const todayAccion = existingActions[0] as AccionWithDynamicProps
            const values: Record<string, number> = {}
            const actionColumns = [
                'produccion_real', 'pinche_apertura', 'pinche_sanitario', 'pinche_tierno',
                'temperatura', 'humedad', 'arveja', 'garbanzo', 'uva', 'arroz',
                'rayando_color', 'sepalos_abiertos', 'cosecha'
            ]

            actionColumns.forEach(col => {
                if (todayAccion[col] !== null && todayAccion[col] !== undefined) {
                    values[col] = todayAccion[col]
                }
            })

            return values
        } catch (error) {
            console.error('Error getting today\'s values locally:', error)
            return {}
        }
    },

    /**
     * Get acciones for a specific cama from local database
     */
    async getAccionesByCama(camaId: number): Promise<Accion[]> {
        try {
            const acciones = await db.acciones
                .where('cama_id')
                .equals(camaId)
                .toArray()

            return acciones.sort((a, b) => {
                return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
            })
        } catch (error) {
            console.error('Error getting acciones locally:', error)
            return []
        }
    }
}