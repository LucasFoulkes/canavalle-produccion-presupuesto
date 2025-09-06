import { supabase } from '@/lib/supabase'
import { db, TABLES } from '@/lib/dexie'
import { Usuario } from '@/types/database'

export type { Usuario }

export const authService = {
    async authenticateWithPin(pin: string): Promise<Usuario | null> {
        console.log('Authenticating with PIN:', pin)

        // 1. Always try offline first
        try {
            // Normalize input
            const pinStr = String(pin)
            const pinNum = parseInt(pinStr, 10)

            console.log('Searching (offline) pin / clave_pin =', pinStr)

            // Strategy: search by pin index, then by clave_pin index if different
            let offlineUser = await db.usuario.where('pin').equals(pinStr).first()
            if (!offlineUser && !isNaN(pinNum)) {
                offlineUser = await db.usuario.where('pin').equals(pinNum as any).first()
            }
            if (!offlineUser) {
                offlineUser = await db.usuario.where('clave_pin').equals(pinStr).first()
            }
            if (!offlineUser && !isNaN(pinNum)) {
                offlineUser = await db.usuario.where('clave_pin').equals(pinNum as any).first()
            }

            if (offlineUser) {
                // Ensure canonical pin field is populated for future fast lookups
                if (!offlineUser.pin && (offlineUser as any).clave_pin) {
                    offlineUser.pin = (offlineUser as any).clave_pin as any
                    await db.usuario.put(offlineUser)
                }
                console.log('User found offline:', offlineUser)
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
            // New schema column name is clave_pin; legacy might still respond to pin. Try clave_pin first.
            let { data, error } = await supabase
                .from(TABLES.usuario)
                .select('*')
                .eq('clave_pin', pin)
                .single()

            if (error && (error as any).code === '42703') {
                // Column does not exist (maybe still legacy) -> fallback to pin
                console.warn('clave_pin column missing remotely, falling back to pin')
                    ; ({ data, error } = await supabase
                        .from(TABLES.usuario)
                        .select('*')
                        .eq('pin', pin)
                        .single())
            }

            if (error || !data) {
                console.error('Online authentication error:', error)
                return null
            }

            // 3. Store in Dexie for offline use
            // Backfill local canonical fields for consistency
            const normalized = { ...data } as any
            if (!normalized.pin && normalized.clave_pin) normalized.pin = normalized.clave_pin
            await db.usuario.put(normalized)
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
    }
}