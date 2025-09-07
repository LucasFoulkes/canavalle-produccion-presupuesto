import { supabase } from '@/lib/supabase'
import { db, TABLES } from '@/lib/dexie'
import { observacionesService } from '@/services/observaciones.service'
// Using select('*') with Supabase-native field names; no mapping

export const syncService = {
    async syncAllData(): Promise<void> {
        try {
            console.log('Starting sync for usuario, finca, bloque, variedad, grupo_cama, cama, observacion...')

            // Small helpers to keep this file DRY
            const fetchRows = async (tableName: string) => {
                const { data, error } = await supabase.from(tableName).select('*')
                if (error) throw error
                return data ?? []
            }
            const tableExists = (name: string) => db.tables.some(t => t.name === name)
            const syncReplace = async <T>(
                tableName: string,
                mapRow: (r: any) => T,
                store: { clear: () => Promise<any>; bulkPut: (d: T[]) => Promise<any> },
                logLabel: string,
                keep?: (x: T) => boolean
            ) => {
                const raw = await fetchRows(tableName)
                const mapped = raw.map(mapRow)
                const data = keep ? mapped.filter(keep) : mapped
                if (tableExists(tableName)) {
                    await store.clear()
                    await store.bulkPut(data as any)
                    console.log(`[sync] Replaced with ${data.length} ${logLabel} records`)
                } else {
                    console.warn(`${logLabel} table not defined in Dexie schema, skipping sync`)
                }
            }
            const syncMerge = async <T>(
                tableName: string,
                mapRow: (r: any) => T,
                store: { bulkPut: (d: T[]) => Promise<any> },
                logLabel: string
            ) => {
                const raw = await fetchRows(tableName)
                const data = raw.map(mapRow)
                await store.bulkPut(data as any)
                console.log(`[sync] Merged ${data.length} ${logLabel} records from server`)
            }

            // Sync usuarios
            await syncReplace(TABLES.usuario, (u: any) => ({ ...u }), db.usuario, 'usuario')

            // Sync fincas
            await syncReplace(
                TABLES.finca,
                (f: any) => ({ ...f }),
                db.finca,
                'finca',
                (f: any) => !f.eliminado_en
            )

            // Sync bloques (normalize bloque_id -> id, set codigo fallback, coerce numeric fields)
            await syncReplace(
                TABLES.bloque,
                (b: any) => ({ ...b }),
                db.bloque,
                'bloque',
                (b: any) => !b.eliminado_en
            )

            // Sync variedades
            await syncReplace(
                TABLES.variedad,
                (v: any) => ({ ...v }),
                db.variedad,
                'variedad',
                (v: any) => !v.eliminado_en
            )

            // (breeder removed)

            // Sync grupo_cama
            try {
                await syncReplace(
                    TABLES.grupoCama,
                    (g: any) => ({ ...g }),
                    db.grupoCama,
                    'grupo_cama',
                    (g: any) => !g.eliminado_en
                )
            } catch (ge) {
                console.error('grupo_cama sync error:', ge)
            }

            // Sync camas (normalize cama_id -> id, map id_grupo->grupo_id, coerce numeric fields, filter deleted)
            await syncReplace(
                TABLES.cama,
                (c: any) => ({ ...c }),
                db.cama,
                'cama',
                (c: any) => !c.eliminado_en
            )

            // (estado_fenologico removed)

            // (medicion_diaria removed)

            // Push local pending observaciones (those without server id)
            try {
                const localObs = await db.observacion.toArray()
                const pending = localObs.filter(o => !o.id_observacion && !o.eliminado_en)
                if (pending.length) console.log(`[sync] Pushing ${pending.length} pending observacion records...`)
                for (const o of pending) {
                    try {
                        await observacionesService.syncUpsert(o as any)
                    } catch (pe) {
                        console.warn('[sync] observacion push failed for local id', o.id, pe)
                    }
                }
            } catch (pe2) {
                console.warn('[sync] pending observacion push step failed', pe2)
            }

            // Pull remote observaciones and merge locally
            try {
                await syncMerge(
                    TABLES.observacion,
                    (o: any) => ({ ...o, id: o.id_observacion }),
                    db.observacion,
                    'observacion'
                )
            } catch (oe) {
                console.warn('observacion sync error', oe)
            }

            console.log('All data sync completed')
        } catch (error) {
            console.error('Error during data sync:', error)
        }
    }
}