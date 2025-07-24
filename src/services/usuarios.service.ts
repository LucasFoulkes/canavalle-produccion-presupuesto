import { supabase } from '@/lib/supabase'
import { db } from '@/lib/dexie'
import { syncService } from './sync.service'
import { Usuario } from '@/types/database'

export type { Usuario }

export const authService = {
    async authenticateWithPin(pin: string): Promise<Usuario | null> {
        // 1. Try offline first
        const offlineUser = await db.usuarios.where('pin').equals(pin).first()
        if (offlineUser) {
            // User found offline, trigger background sync
            syncService.syncAllData()
            return offlineUser
        }

        // 2. If not found, try online
        const { data, error } = await supabase
            .from('usuarios')
            .select('*')
            .eq('pin', pin)
            .single()

        if (error || !data) {
            console.error('Authentication error:', error)
            return null
        }

        // 3. Store in Dexie for offline use
        await db.usuarios.put(data)

        // 4. Trigger full data sync after successful online login
        syncService.syncAllData()

        return data
    },

    getStoredUsuarios: async (): Promise<Usuario[]> => {
        return await db.usuarios.toArray();
    },
}