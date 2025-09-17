import { getStore, initDexieSchema, type AnyRow } from '@/lib/dexie'
import { SERVICE_PK } from '@/services/db'
import { supabase } from '@/lib/supabase'

export type SyncResult = { table: string; count: number }

// Upsert array of rows into Dexie using the configured PK
async function upsertIntoDexie(table: string, rows: AnyRow[]) {
    const store = getStore(table)
    await store.bulkPut(rows)
}

export async function syncTable(table: string): Promise<SyncResult> {
    if (!SERVICE_PK[table]) {
        // Table not configured for Dexie; skip
        return { table, count: 0 }
    }
    const pk = SERVICE_PK[table]
    const pageSize = 1000
    let offset = 0
    let total = 0

    // Fetch all rows in pages ordered by PK for deterministic paging
    // Use while loop and break when fewer than pageSize are returned
    // Bulk upsert each page directly into Dexie to avoid large memory spikes
    // Note: range is inclusive [from, to]
    for (; ;) {
        const from = offset
        const to = offset + pageSize - 1
        const { data, error } = await supabase
            .from(table)
            .select('*')
            .order(pk, { ascending: true })
            .range(from, to)

        if (error) throw new Error(`Failed to fetch ${table} page starting at ${from}: ${error.message}`)
        const rows: AnyRow[] = Array.isArray(data) ? (data as AnyRow[]) : []
        if (rows.length === 0) break

        await upsertIntoDexie(table, rows)
        total += rows.length

        if (rows.length < pageSize) break
        offset += pageSize
    }

    return { table, count: total }
}

export async function syncAllTables(): Promise<SyncResult[]> {
    await initDexieSchema()
    const tables = Object.keys(SERVICE_PK)
    const results: SyncResult[] = []
    for (const t of tables) {
        try {
            const r = await syncTable(t)
            results.push(r)
        } catch (e) {
            // continue; partial sync is okay
            console.warn(e)
        }
    }
    return results
}
