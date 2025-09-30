import { supabase } from '@/lib/supabase'
import { db } from '@/lib/db'
import type { DexieTable } from '@/lib/data-utils'

type SyncRow = {
    id: number | string
    created_at: string | null
    tables: any
}

type SyncCheck = {
    revision: number
    updatedTables: Set<string>
    hasLocalSync: boolean
    hasNewRows: boolean
    totalSyncRows: number
    fetchFailed: boolean
}

let syncCheckPromise: Promise<SyncCheck> | null = null
let syncCheckResult: SyncCheck | null = null
let refreshedRevision = 0
let refreshedTables = new Set<string>()

function normalizeTableName(table: string): string {
    return table.trim().toLowerCase()
}

function parseTables(value: any): string[] {
    if (!value) return []
    if (Array.isArray(value)) {
        const out: string[] = []
        for (const item of value) {
            out.push(...parseTables(item))
        }
        return out
    }
    if (typeof value === 'string') {
        const trimmed = value.trim()
        if (!trimmed) return []
        try {
            if ((trimmed.startsWith('[') && trimmed.endsWith(']')) || (trimmed.startsWith('{') && trimmed.endsWith('}'))) {
                const parsed = JSON.parse(trimmed)
                return parseTables(parsed)
            }
        } catch {
            // ignore parse errors and fall through
        }
        if (trimmed.includes(',')) {
            return trimmed.split(',').map((part) => part.trim()).filter(Boolean)
        }
        return [trimmed]
    }
    if (typeof value === 'object') {
        const out: string[] = []
        if (Array.isArray((value as any).tables)) {
            out.push(...parseTables((value as any).tables))
        } else if (typeof (value as any).tables === 'string') {
            out.push(...parseTables((value as any).tables))
        }
        for (const [key, val] of Object.entries(value)) {
            if (key === 'tables') continue
            if (typeof val === 'boolean') {
                if (val) out.push(key)
            } else {
                out.push(...parseTables(val))
            }
        }
        if (!out.length && Object.keys(value).length) {
            out.push(...Object.keys(value))
        }
        return out
    }
    return [String(value)]
}

function scheduleResultInvalidation(result: SyncCheck) {
    setTimeout(() => {
        if (syncCheckResult === result) {
            syncCheckResult = null
        }
    }, 0)
}

async function computeSyncCheck(): Promise<SyncCheck> {
    const revision = Date.now()
    try {
        const localRows = await db.sync.toArray()
        let lastCreated = ''
        for (const row of localRows as SyncRow[]) {
            const created = row?.created_at ?? ''
            if (created && created > lastCreated) lastCreated = created
        }

        let query = supabase
            .from('sync')
            .select('id, created_at, tables')
            .order('created_at', { ascending: true })

        if (lastCreated) {
            query = query.gt('created_at', lastCreated)
        }

        const { data, error } = await query
        if (error) throw error

        const newRows = (data ?? []) as SyncRow[]
        if (newRows.length) {
            await db.sync.bulkPut(newRows as any)
        }

        const tables = new Set<string>()
        for (const row of newRows) {
            for (const name of parseTables(row.tables)) {
                const normalized = normalizeTableName(name)
                if (normalized) tables.add(normalized)
            }
        }

        return {
            revision,
            updatedTables: tables,
            hasLocalSync: localRows.length > 0 || newRows.length > 0,
            hasNewRows: newRows.length > 0,
            totalSyncRows: localRows.length + newRows.length,
            fetchFailed: false,
        }
    } catch (err) {
        console.warn('sync check failed; falling back to full refresh', err)
        return {
            revision,
            updatedTables: new Set<string>(),
            hasLocalSync: false,
            hasNewRows: false,
            totalSyncRows: 0,
            fetchFailed: true,
        }
    }
}

async function getSyncCheck(): Promise<SyncCheck> {
    if (syncCheckResult) return syncCheckResult
    if (!syncCheckPromise) {
        syncCheckPromise = computeSyncCheck()
            .then((result) => {
                syncCheckResult = result
                scheduleResultInvalidation(result)
                return result
            })
            .finally(() => {
                syncCheckPromise = null
            })
    }
    return syncCheckPromise
}

async function getLocalCount(store: DexieTable<any>): Promise<number> {
    if (typeof store.count === 'function') {
        try {
            return await store.count()
        } catch {
            // fall through to toArray()
        }
    }
    const rows = await store.toArray()
    return rows.length
}

export async function shouldRefreshTable(table: string, store: DexieTable<any>): Promise<boolean> {
    const normalized = normalizeTableName(table)
    const localCount = await getLocalCount(store)
    const isEmpty = localCount === 0
    const check = await getSyncCheck()

    if (check.revision !== refreshedRevision) {
        refreshedRevision = check.revision
        refreshedTables = new Set<string>()
    }

    if (refreshedTables.has(normalized)) {
        return false
    }

    if (check.fetchFailed) {
        refreshedTables.add(normalized)
        return true
    }

    if (normalized === 'sync') {
        if (isEmpty) {
            refreshedTables.add(normalized)
            return true
        }
        return false
    }

    if (check.totalSyncRows === 0) {
        if (isEmpty) {
            refreshedTables.add(normalized)
            return true
        }
        return false
    }

    if (!check.hasNewRows) {
        if (isEmpty) {
            refreshedTables.add(normalized)
            return true
        }
        return false
    }

    if (check.updatedTables.has('*') || check.updatedTables.has(normalized)) {
        refreshedTables.add(normalized)
        return true
    }

    return false
}

export function resetSyncCache() {
    syncCheckPromise = null
    syncCheckResult = null
    refreshedRevision = 0
    refreshedTables.clear()
}
