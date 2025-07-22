import { db } from '@/lib/dexie'
import { supabase } from '@/lib/supabase'
import { Cama } from '@/types/database'

export interface VariedadRange {
    varietyId: number
    varietyName: string
    startNumber: number
    endNumber: number
}

// Track ongoing sync operations to prevent duplicates
const syncInProgress = new Set<number>()

export const camaAssignmentService = {

    async assignCamasToBloque(
        bloqueId: number,
        _totalCamas: number,
        varietyRanges: VariedadRange[]
    ): Promise<void> {
        try {
            console.log('=== STARTING CAMA ASSIGNMENT ===')
            console.log('Bloque ID:', bloqueId)
            console.log('Variety ranges:', varietyRanges)

            // Step 1: Delete ALL existing camas for this bloque (locally)
            console.log('Step 1: Deleting existing local camas for bloque:', bloqueId)
            const existingCamas = await db.camas.where('bloque_id').equals(bloqueId).toArray()
            console.log('Found', existingCamas.length, 'existing camas to delete')

            const deletedCount = await db.camas.where('bloque_id').equals(bloqueId).delete()
            console.log('Successfully deleted', deletedCount, 'local camas')

            // Step 2: Verify deletion worked
            const remainingCamas = await db.camas.where('bloque_id').equals(bloqueId).toArray()
            if (remainingCamas.length > 0) {
                console.error('WARNING: Still found', remainingCamas.length, 'camas after deletion!')
                // Force delete any remaining ones
                for (const cama of remainingCamas) {
                    await db.camas.delete(cama.id)
                }
            }

            // Step 3: Create new camas data structure
            const camasToCreate: Omit<Cama, 'id'>[] = []

            for (const range of varietyRanges) {
                console.log(`Creating camas for variety ${range.varietyName} (${range.startNumber}-${range.endNumber})`)

                for (let camaNumber = range.startNumber; camaNumber <= range.endNumber; camaNumber++) {
                    camasToCreate.push({
                        bloque_id: bloqueId,
                        variedad_id: range.varietyId,
                        nombre: camaNumber.toString()
                    })
                }
            }

            console.log('Step 3: Prepared', camasToCreate.length, 'new camas to create')

            // Step 4: Insert new camas with unique IDs
            const baseId = Date.now()
            console.log('Step 4: Creating new camas with base ID:', baseId)

            for (let i = 0; i < camasToCreate.length; i++) {
                const cama = camasToCreate[i]
                const newCama = {
                    ...cama,
                    id: baseId + i // Ensure unique IDs by adding index
                }
                await db.camas.put(newCama)
            }

            // Step 5: Verify creation worked
            const finalCamas = await db.camas.where('bloque_id').equals(bloqueId).toArray()
            console.log('Step 5: Verification - Found', finalCamas.length, 'camas after creation')
            console.log('Expected:', camasToCreate.length, 'camas')

            if (finalCamas.length !== camasToCreate.length) {
                throw new Error(`Cama count mismatch! Expected: ${camasToCreate.length}, Found: ${finalCamas.length}`)
            }

            console.log('=== CAMA ASSIGNMENT COMPLETED SUCCESSFULLY ===')

            // Step 6: Sync with server in background
            if (!syncInProgress.has(bloqueId)) {
                this.syncWithServer(bloqueId, varietyRanges).catch(console.error)
            }

        } catch (error) {
            console.error('=== ERROR IN CAMA ASSIGNMENT ===')
            console.error('Error assigning camas:', error)
            throw new Error('Error al asignar camas al bloque: ' + (error instanceof Error ? error.message : String(error)))
        }
    },

    async syncWithServer(bloqueId: number, _varietyRanges: VariedadRange[]): Promise<void> {
        // Prevent multiple simultaneous syncs for the same bloque
        if (syncInProgress.has(bloqueId)) {
            console.log('Sync already in progress for bloque:', bloqueId)
            return
        }

        syncInProgress.add(bloqueId)

        try {
            console.log('=== STARTING SERVER SYNC ===')
            console.log('Syncing bloque:', bloqueId)

            // Step 1: Delete ALL existing camas for this bloque on server
            console.log('Step 1: Deleting existing server camas for bloque:', bloqueId)
            const { data: existingServerCamas, error: selectError } = await supabase
                .from('camas')
                .select('id')
                .eq('bloque_id', bloqueId)

            if (selectError) {
                console.error('Error checking existing server camas:', selectError)
            } else {
                console.log('Found', existingServerCamas?.length || 0, 'existing server camas to delete')
            }

            const { error: deleteError, count: deletedCount } = await supabase
                .from('camas')
                .delete({ count: 'exact' })
                .eq('bloque_id', bloqueId)

            if (deleteError) {
                console.error('Error deleting existing camas on server:', deleteError)
                return
            }

            console.log('Successfully deleted', deletedCount || 0, 'server camas')

            // Step 2: Get local camas to sync
            const localCamas = await db.camas.where('bloque_id').equals(bloqueId).toArray()
            console.log('Step 2: Found', localCamas.length, 'local camas to sync to server')

            if (localCamas.length > 0) {
                // Step 3: Insert in batches to avoid overwhelming the server
                const batchSize = 50
                let totalSynced = 0

                for (let i = 0; i < localCamas.length; i += batchSize) {
                    const batch = localCamas.slice(i, i + batchSize)
                    console.log(`Syncing batch ${Math.floor(i / batchSize) + 1}: ${batch.length} camas`)

                    const { error, count } = await supabase
                        .from('camas')
                        .insert(batch.map(cama => ({
                            bloque_id: cama.bloque_id,
                            variedad_id: cama.variedad_id,
                            nombre: cama.nombre
                        })), { count: 'exact' })

                    if (error) {
                        console.error('Error syncing batch to server:', error)
                        return
                    }

                    totalSynced += count || batch.length
                    console.log(`Batch synced successfully. Total synced so far: ${totalSynced}`)
                }

                console.log('=== SERVER SYNC COMPLETED ===')
                console.log('Total camas synced:', totalSynced)

                // Step 4: Verify server sync
                const { data: finalServerCamas, error: verifyError } = await supabase
                    .from('camas')
                    .select('id')
                    .eq('bloque_id', bloqueId)

                if (!verifyError && finalServerCamas) {
                    console.log('Verification: Server now has', finalServerCamas.length, 'camas for bloque', bloqueId)
                    if (finalServerCamas.length !== localCamas.length) {
                        console.warn(`WARNING: Server sync count mismatch! Local: ${localCamas.length}, Server: ${finalServerCamas.length}`)
                    }
                }
            }

        } catch (error) {
            console.error('=== ERROR IN SERVER SYNC ===')
            console.error('Error syncing with server:', error)
            // Don't throw here - offline functionality should still work
        } finally {
            syncInProgress.delete(bloqueId)
        }
    },



    async getCamasForBloque(bloqueId: number): Promise<Cama[]> {
        return await db.camas.where('bloque_id').equals(bloqueId).toArray()
    },

    // Update varieties of existing camas without deleting them
    async updateCamaVarieties(
        bloqueId: number,
        varietyRanges: VariedadRange[]
    ): Promise<void> {
        try {
            console.log('=== UPDATING CAMA VARIETIES ===')
            console.log('Bloque ID:', bloqueId)
            console.log('Variety ranges:', varietyRanges)

            // Get all existing camas for this bloque
            const existingCamas = await db.camas.where('bloque_id').equals(bloqueId).toArray()
            console.log('Found', existingCamas.length, 'existing camas')

            if (existingCamas.length === 0) {
                throw new Error('No existing camas found for this bloque')
            }

            // Sort camas by nombre (numerically)
            existingCamas.sort((a, b) => {
                const numA = parseInt(a.nombre) || 0
                const numB = parseInt(b.nombre) || 0
                return numA - numB
            })

            // Update varieties based on ranges
            let updatedCount = 0
            for (const range of varietyRanges) {
                console.log(`Updating camas ${range.startNumber}-${range.endNumber} to variety ${range.varietyName}`)

                for (const cama of existingCamas) {
                    const camaNumber = parseInt(cama.nombre) || 0

                    if (camaNumber >= range.startNumber && camaNumber <= range.endNumber) {
                        // Update this cama's variety
                        await db.camas.update(cama.id, {
                            variedad_id: range.varietyId
                        })
                        updatedCount++
                    }
                }
            }

            console.log('Successfully updated', updatedCount, 'cama varieties')

            // Sync changes to server
            if (!syncInProgress.has(bloqueId)) {
                this.syncWithServer(bloqueId, varietyRanges).catch(console.error)
            }

            console.log('=== CAMA VARIETY UPDATE COMPLETED ===')

        } catch (error) {
            console.error('=== ERROR UPDATING CAMA VARIETIES ===')
            console.error('Error updating cama varieties:', error)
            throw new Error('Error al actualizar las variedades de las camas: ' + (error instanceof Error ? error.message : String(error)))
        }
    }
}