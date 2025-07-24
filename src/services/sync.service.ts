import { supabase } from '@/lib/supabase'
import { db } from '@/lib/dexie'

export const syncService = {
    async syncAllData(): Promise<void> {
        try {
            console.log('Starting usuarios sync...')
            const { data, error } = await supabase.from('usuarios').select('*')
            if (error) throw error
            if (data && Array.isArray(data)) {
                if (db.tables.some(table => table.name === 'usuarios')) {
                    await db.usuarios.bulkPut(data)
                    console.log(`Updated ${data.length} usuarios records`)
                } else {
                    console.warn('usuarios table not defined in Dexie schema, skipping sync')
                }
            }
            console.log('Usuarios sync completed')
        } catch (error) {
            console.error('Error during usuarios sync:', error)
        }
    }
}