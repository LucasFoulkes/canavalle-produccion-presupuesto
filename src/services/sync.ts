import { AnyRow, getStore, initDexieSchema } from '@/lib/dexie'
import { SERVICE_PK, observacionService, pincheService, produccionService, puntosGpsService } from '@/services/db'
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
    punto_gps?: string | null
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
      punto_gps: (row as any).punto_gps ?? null,
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

// --- Outbound (push) sync: upload offline-created pinches ---
export async function pushPendingPinches(): Promise<PushResult> {
  await initDexieSchema()

  const result: PushResult = { attempted: 0, succeeded: 0, failed: 0 }

  if (isOffline()) {
    console.info('[push] skipped pinches: browser is offline')
    return result
  }

  const store = getStore('pinche')
  const all = (await store.toArray()) as AnyRow[]
  type PendingPinche = {
    id: number | string
    bloque: number | string | null
    cama: number | string | null
    variedad: number | string | null
    cantidad: number
    tipo: string
    needs_sync?: boolean
    [k: string]: unknown
  }
  const pending = all.filter((r) => (r as PendingPinche).needs_sync) as PendingPinche[]

  if (pending.length === 0) return result

  for (const row of pending) {
    result.attempted++
    const tempId = row.id
    const payload = {
      bloque: row.bloque ?? null,
      cama: row.cama ?? null,
      variedad: row.variedad ?? null,
      cantidad: row.cantidad,
      tipo: row.tipo,
    }

    try {
      const { data, error } = await pincheService.insert(payload)
      if (error) throw error

      // Replace temp row with server row
      if (typeof tempId !== 'undefined') {
        try { await store.delete(tempId) } catch (err) { console.debug('[push] could not delete temp pinche', err) }
      }
      if (data) {
        await store.put({ ...(data as unknown as AnyRow), needs_sync: false })
      }
      result.succeeded++
    } catch (e) {
      console.warn('[push] failed to upload pinche', e)
      result.failed++
      // keep the row for future retries
    }
  }

  return result
}

// --- Outbound (push) sync: upload offline-created produccion ---
export async function pushPendingProduccion(): Promise<PushResult> {
  await initDexieSchema()

  const result: PushResult = { attempted: 0, succeeded: 0, failed: 0 }

  if (isOffline()) {
    console.info('[push] skipped produccion: browser is offline')
    return result
  }

  const store = getStore('produccion')
  const all = (await store.toArray()) as AnyRow[]
  type PendingProd = {
    __key: string
    finca: number | string | null
    bloque: number | string | null
    variedad: number | string | null
    cantidad: number
    needs_sync?: boolean
    [k: string]: unknown
  }
  const pending = all.filter((r) => (r as PendingProd).needs_sync) as PendingProd[]

  if (pending.length === 0) return result

  let anySucceeded = false
  for (const row of pending) {
    result.attempted++
    const tempKey = row.__key
    const payload = {
      finca: row.finca ?? null,
      bloque: row.bloque ?? null,
      variedad: row.variedad ?? null,
      cantidad: row.cantidad,
    }

    try {
      const { error } = await produccionService.insert(payload)
      if (error) throw error

      // Remove temp row; we rely on next pull to bring server rows
      if (typeof tempKey !== 'undefined') {
        try { await store.delete(tempKey) } catch (err) { console.debug('[push] could not delete temp produccion', err) }
      }
      result.succeeded++
      anySucceeded = true
    } catch (e) {
      console.warn('[push] failed to upload produccion', e)
      result.failed++
      // keep the row for future retries
    }
  }

  // If at least one row was uploaded, refresh the produccion table
  if (anySucceeded) {
    try { await syncTable('produccion') } catch (err) { console.debug('[push] ignore produccion refresh error', err) }
  }

  return result
}

// --- Outbound (push) sync: upload offline-captured puntos_gps ---
export async function pushPendingPuntosGps(): Promise<PushResult> {
  await initDexieSchema()

  const result: PushResult = { attempted: 0, succeeded: 0, failed: 0 }

  if (isOffline()) {
    console.info('[push] skipped puntos_gps: browser is offline')
    return result
  }

  const store = getStore('puntos_gps')
  const all = (await store.toArray()) as AnyRow[]
  type PendingGps = {
    id?: string
    latitud: number
    longitud: number
    precision?: number | null
    altitud?: number | null
    capturado_en: string
    observacion?: boolean
    usuario_id?: number | null
    needs_sync?: boolean
  }
  const pending = all.filter((r) => (r as PendingGps).needs_sync) as PendingGps[]

  if (pending.length === 0) return result

  let anySucceeded = false
  for (const row of pending) {
    result.attempted++
    const tempId = (row as any).id ?? null
    const payload = {
      latitud: row.latitud,
      longitud: row.longitud,
      precision: row.precision ?? null,
      altitud: row.altitud ?? null,
      capturado_en: row.capturado_en,
      observacion: row.observacion ?? false,
      usuario_id: row.usuario_id ?? null,
    }

    try {
      const { error } = await puntosGpsService.insert(payload as any)
      if (error) throw error
      if (tempId) { try { await store.delete(tempId) } catch (err) { console.debug('[push] ignore delete temp gps error', err) } }
      result.succeeded++
      anySucceeded = true
    } catch (e) {
      console.warn('[push] failed to upload puntos_gps', e)
      result.failed++
    }
  }

  if (anySucceeded) {
    try { await syncTable('puntos_gps') } catch (err) { console.debug('[push] ignore puntos_gps refresh error', err) }
  }

  return result
}
