import { supabase } from '@/lib/supabase'
import { db } from '@/lib/dexie'
import { EstadoFenologico } from '@/types/database'
import { syncService } from './sync.service'

export type { EstadoFenologico }

export interface EstadoFenologicoWithRelations {
    id: number
    finca_nombre?: string
    bloque_nombre?: string
    variedad_nombre?: string
    brotacion?: number
    '5_cm'?: number
    '15_cm'?: number
    '20_cm'?: number
    primera_hoja?: number
    espiga?: number
    arroz?: number
    arveja?: number
    garbanzo?: number
    uva?: number
    rayando_color?: number
    sepalos_abiertos?: number
    cosecha?: number
}

export const estadosFenologicosService = {
    // Get all estados fenológicos with related finca, bloque, and variedad names
    async getAll(): Promise<EstadoFenologicoWithRelations[]> {
        try {
            // Try to sync with server first
            await syncService.tryUpdateEstadosFenologicos()

            // Try to get data from server with relations
            const { data, error } = await supabase
                .from('estados_fenologicos')
                .select(`
                    id,
                    *,
                    bloque_variedad:bloque_variedad_id (
                        bloque:bloque_id (
                            id,
                            nombre,
                            finca:finca_id (
                                id,
                                nombre
                            )
                        ),
                        variedad:variedad_id (
                            id,
                            nombre
                        )
                    )
                `)
                .order('id', { ascending: true })

            if (error) throw error

            // Transform and return the data
            return this.transformEstadosFenologicos(data || [])
        } catch (error) {
            console.error('Error fetching estados fenologicos from server, trying offline data:', error)

            // Try to get data from IndexedDB
            try {
                const offlineData = await db.estadosFenologicos.toArray()

                // We need to manually join with related data since we don't have the server's join capability
                const transformedData = await this.enrichOfflineData(offlineData)
                return transformedData
            } catch (offlineError) {
                console.error('Error fetching offline estados fenologicos data:', offlineError)
                return []
            }
        }
    },

    // Transform raw estados fenologicos data
    transformEstadosFenologicos(data: any[]): EstadoFenologicoWithRelations[] {
        return data.map((estado: any) => ({
            id: estado.id,
            finca_nombre: estado.bloque_variedad?.bloque?.finca?.nombre || 'N/A',
            bloque_nombre: estado.bloque_variedad?.bloque?.nombre || 'N/A',
            variedad_nombre: estado.bloque_variedad?.variedad?.nombre || 'N/A',
            brotacion: estado.brotacion,
            '5_cm': estado['5_cm'],
            '15_cm': estado['15_cm'],
            '20_cm': estado['20_cm'],
            primera_hoja: estado.primera_hoja,
            espiga: estado.espiga,
            arroz: estado.arroz,
            arveja: estado.arveja,
            garbanzo: estado.garbanzo,
            uva: estado.uva,
            rayando_color: estado.rayando_color,
            sepalos_abiertos: estado.sepalos_abiertos,
            cosecha: estado.cosecha,
        }))
    },

    // Enrich offline data with related information
    async enrichOfflineData(offlineData: any[]): Promise<EstadoFenologicoWithRelations[]> {
        const result: EstadoFenologicoWithRelations[] = []

        for (const estado of offlineData) {
            // Get bloque_variedad record
            const bloqueVariedad = await db.bloqueVariedades.get(estado.bloque_variedad_id)
            if (!bloqueVariedad) continue

            // Get bloque record
            const bloque = await db.bloques.get(bloqueVariedad.bloque_id)
            if (!bloque) continue

            // Get finca record
            const finca = await db.fincas.get(bloque.finca_id)

            // Get variedad record
            const variedad = await db.variedades.get(bloqueVariedad.variedad_id)

            result.push({
                id: estado.id,
                finca_nombre: finca?.nombre || 'N/A',
                bloque_nombre: bloque?.nombre || 'N/A',
                variedad_nombre: variedad?.nombre || 'N/A',
                brotacion: estado.brotacion,
                '5_cm': estado['5_cm'],
                '15_cm': estado['15_cm'],
                '20_cm': estado['20_cm'],
                primera_hoja: estado.primera_hoja,
                espiga: estado.espiga,
                arroz: estado.arroz,
                arveja: estado.arveja,
                garbanzo: estado.garbanzo,
                uva: estado.uva,
                rayando_color: estado.rayando_color,
                sepalos_abiertos: estado.sepalos_abiertos,
                cosecha: estado.cosecha,
            })
        }

        return result
    },

    // Get a specific estado fenológico by ID
    async getEstadoFenologicoById(id: number): Promise<EstadoFenologico | null> {
        try {
            const { data, error } = await supabase
                .from('estados_fenologicos')
                .select('*')
                .eq('id', id)
                .single()

            if (error) throw error

            // Store in local DB for offline access
            if (data) {
                await db.estadosFenologicos.put(data)
            }

            return data
        } catch (error) {
            console.error('Error fetching estado fenologico from server, trying offline data:', error)
            const result = await db.estadosFenologicos.get(id)
            return result || null
        }
    },

    // Update a specific estado fenológico
    async updateEstadoFenologico(id: number, updates: Partial<EstadoFenologico>): Promise<EstadoFenologico> {
        try {
            const { data, error } = await supabase
                .from('estados_fenologicos')
                .update(updates)
                .eq('id', id)
                .select()
                .single()

            if (error) throw error

            // Update local DB
            if (data) {
                await db.estadosFenologicos.put(data)
            }

            return data
        } catch (error) {
            console.error('Error updating estado fenologico on server:', error)

            // Update locally anyway
            const localUpdate = {
                id,
                ...updates,
                // Add a flag to indicate this needs to be synced later
                _pendingSync: true
            }

            await db.estadosFenologicos.update(id, localUpdate)
            return await db.estadosFenologicos.get(id) as EstadoFenologico
        }
    },

    // Delete a estado fenológico
    async deleteEstadoFenologico(id: number): Promise<void> {
        try {
            const { error } = await supabase
                .from('estados_fenologicos')
                .delete()
                .eq('id', id)

            if (error) throw error

            // Delete from local DB
            await db.estadosFenologicos.delete(id)
        } catch (error) {
            console.error('Error deleting estado fenologico from server:', error)

            // Mark as deleted locally by removing from local DB
            // Since we can't add custom properties, just delete it locally
            await db.estadosFenologicos.delete(id)
        }
    }
}