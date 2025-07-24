import { supabase } from '@/lib/supabase'
import { db } from '@/lib/dexie'
import { syncService } from './sync.service'
import { Usuario } from '@/types/database'

export type { Usuario }

export const authService = {
    async authenticateWithPin(pin: string): Promise<Usuario | null> {
        console.log('Authenticating with PIN:', pin)

        // 1. Always try offline first
        try {
            const offlineUser = await db.usuarios.where('pin').equals(pin).first()
            if (offlineUser) {
                console.log('User found offline:', offlineUser)
                // User found offline, only trigger sync if online
                if (navigator.onLine) {
                    syncService.syncAllData().catch(err => console.log('Background sync failed:', err))
                }
                return offlineUser
            }
            console.log('User not found offline, checking online...')
        } catch (error) {
            console.error('Offline auth error:', error)
        }

        // 2. If not found offline and we're online, try online
        if (!navigator.onLine) {
            console.log('Offline and user not found locally')
            return null
        }

        try {
            const { data, error } = await supabase
                .from('usuarios')
                .select('*')
                .eq('pin', pin)
                .single()

            if (error || !data) {
                console.error('Online authentication error:', error)
                return null
            }

            // 3. Store in Dexie for offline use
            await db.usuarios.put(data)
            console.log('User stored offline for future use')

            // 4. Trigger full data sync after successful online login
            syncService.syncAllData().catch(err => console.log('Sync failed:', err))

            return data
        } catch (error) {
            console.error('Network error during authentication:', error)
            return null
        }
    },

    getStoredUsuarios: async (): Promise<Usuario[]> => {
        return await db.usuarios.toArray();
    }
}