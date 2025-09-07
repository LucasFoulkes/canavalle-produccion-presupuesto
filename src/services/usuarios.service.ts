import { supabase } from '@/lib/supabase'
import { db, TABLES } from '@/lib/dexie'
import { Usuario } from '@/types/database'

export type { Usuario }

export const authService = {
    // Session helpers (localStorage-based)
    getSessionUserId: (): number | null => {
        try {
            const v = localStorage.getItem('currentUserId')
            return v ? Number(v) : null
        } catch {
            return null
        }
    },
    setSessionUser: (userId: number) => {
        try { localStorage.setItem('currentUserId', String(userId)) } catch { }
    },
    clearSession: () => {
        try { localStorage.removeItem('currentUserId') } catch { }
    },
    // Preload usuarios into Dexie if empty and online, so PIN login works offline later
    preloadUsuariosIfNeeded: async (): Promise<number> => {
        try {
            const count = await db.usuario.count()
            if (count > 0 || !navigator.onLine) return count
            const { data, error } = await supabase
                .from(TABLES.usuario)
                .select('*')
                .is('eliminado_en', null)
            if (error || !data) return count
            await db.usuario.clear()
            await db.usuario.bulkPut(data as any)
            return data.length
        } catch {
            return await db.usuario.count()
        }
    },
    async authenticateWithPin(pin: string): Promise<Usuario | null> {
        console.log('Authenticating with PIN (clave_pin only):', pin)
        // 1. Offline first using clave_pin only
        try {
            const pinStr = String(pin)
            console.log('Searching (offline) clave_pin =', pinStr)
            const offlineUser = await db.usuario.where('clave_pin').equals(pinStr).first()
            if (offlineUser) {
                console.log('User found offline:', offlineUser)
                authService.setSessionUser((offlineUser as any).id_usuario)
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
            // Query strictly by clave_pin
            const { data, error } = await supabase
                .from(TABLES.usuario)
                .select('*')
                .is('eliminado_en', null)
                .eq('clave_pin', pin)
                .maybeSingle()

            if (error || !data) {
                console.error('Online authentication error:', error)
                return null
            }

            // 3. Store in Dexie for offline use
            await db.usuario.put({ ...data } as any)
            authService.setSessionUser((data as any).id_usuario)
            console.log('User stored offline for future use')

            // Removed triggering full data sync here to prevent redundant sync storms.

            return data
        } catch (error) {
            console.error('Network error during authentication:', error)
            return null
        }
    },

    getStoredUsuarios: async (): Promise<Usuario[]> => {
        return await db.usuario.toArray();
    },

    getCurrentUser: async (): Promise<Usuario | null> => {
        const all = await db.usuario.toArray()
        return all.length ? all[0] : null
    },

    logout: async (): Promise<void> => {
        authService.clearSession()
        await db.usuario.clear()
    }
}