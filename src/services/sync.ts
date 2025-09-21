import { AnyRow, getStore, initDexieSchema } from '@/lib/dexie'
import { SERVICE_PK, observacionService } from '@/services/db'
import { supabase } from '@/lib/supabase'

export type SyncResult = { table: string; count: number }

const loggedOfflineTables = new Set<string>()
let loggedOfflineBulk = false

// Upsert array of rows into Dexie using the configured PK
async function upsertIntoDexie(table: string, rows: AnyRow[]) {
  const store = getStore(table)
  await store.bulkPut(rows)
}

function isOffline(): boolean {
  if (typeof navigator === 'undefined') return false
  return navigator.onLine === false
}

function logOfflineTable(table: string) {
  if (!loggedOfflineTables.has(table)) {
    console.info(`[sync] skipped "${table}" because the browser is offline`)
    loggedOfflineTables.add(table)
  }
}

export async function syncTable(table: string): Promise<SyncResult> {
  if (!SERVICE_PK[table]) {
    // Table not configured for Dexie; skip
    return { table, count: 0 }
  }
  if (isOffline()) {
    logOfflineTable(table)
    return { table, count: 0 }
  }

  const pk = SERVICE_PK[table]
  const pageSize = 1000
  let offset = 0
  let total = 0

  for (; ;) {
    const from = offset
    const to = offset + pageSize - 1
    const q = supabase.from(table).select('*')
    // Only order when PK is a real column; for synthetic keys like '__key', skip order
    const query = pk === '__key' ? q : q.order(pk, { ascending: true })
    const { data, error } = await query.range(from, to)

    if (error) throw new Error(`Failed to fetch ${table} page starting at ${from}: ${error.message}`)
    let rows = (data as unknown as AnyRow[]) ?? []
    if (pk === '__key') {
      // Inject a stable synthetic key when server doesn't expose a PK
      rows = rows.map((r, idx) => ({ __key: `${from + idx}`, ...r }))
    }
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
  if (isOffline()) {
    if (!loggedOfflineBulk) {
      console.info('[sync] skipped full refresh because the browser is offline')
      loggedOfflineBulk = true
    }
    return []
  }

  loggedOfflineTables.clear()
  loggedOfflineBulk = false

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

// --- Outbound (push) sync: upload offline-created observations ---
export type PushResult = { attempted: number; succeeded: number; failed: number }

export async function pushPendingObservations(): Promise<PushResult> {
  await initDexieSchema()

  const result: PushResult = { attempted: 0, succeeded: 0, failed: 0 }

  if (isOffline()) {
    console.info('[push] skipped: browser is offline')
    return result
  }

  const store = getStore('observacion')
  // Note: where('needs_sync') requires an index; use toArray + filter instead
  const all = (await store.toArray()) as AnyRow[]
  type PendingObservation = {
    id_observacion: number | string
    id_cama: number | string
    tipo_observacion: string
    cantidad: number
    ubicacion_seccion?: string | null
    id_usuario: number | string
    needs_sync?: boolean
    [k: string]: unknown
  }
  const pending = all.filter((r) => (r as PendingObservation).needs_sync) as PendingObservation[]

  if (pending.length === 0) return result

  for (const row of pending) {
    result.attempted++
    const tempId = row.id_observacion
    const payload = {
      id_cama: row.id_cama,
      tipo_observacion: row.tipo_observacion,
      cantidad: row.cantidad,
      ubicacion_seccion: row.ubicacion_seccion ?? null,
      id_usuario: row.id_usuario,
    }

    try {
      const { data, error } = await observacionService.insert(payload)
      if (error) throw error

      // Replace temp row with server row
      if (typeof tempId !== 'undefined') {
        try { await store.delete(tempId) } catch (err) { console.debug('[push] could not delete temp row', err) }
      }
      if (data) {
        await store.put({ ...(data as unknown as AnyRow), needs_sync: false })
      }
      result.succeeded++
    } catch (e) {
      console.warn('[push] failed to upload observation', e)
      result.failed++
      // keep the row for future retries
    }
  }

  return result
}
