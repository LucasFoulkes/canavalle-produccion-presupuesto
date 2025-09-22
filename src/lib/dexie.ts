import Dexie, { Table } from 'dexie'

// Define a minimal row shape: all values are unknown, but rows must have a PK
export type AnyRow = Record<string, unknown>

// Names of our stores correspond to table names (keys of SERVICE_PK and TABLES)
export class AppDexie extends Dexie {
    // Dynamic table index: [tableName: string]: Table<AnyRow, any>
    // We'll also add typed properties at runtime.
    [storeName: string]: any

    constructor() {
        super('canavalle-db')
        // Stores are defined later via initDexieSchema()
    }
}

export const db = new AppDexie()

// Build Dexie stores dynamically from SERVICE_PK. Must be called once on app startup before use.
export async function initDexieSchema() {
    // dynamic import to avoid circular deps at module top-level
    const { SERVICE_PK: PK } = await import('@/services/db')
    const schema: Record<string, string> = {}

    for (const [table, pk] of Object.entries(PK)) {
        // Dexie expects index string like '++id' for auto-increment, or '&id' for primary key
        // Our PKs are natural keys from Supabase; use '&<pk>' for unique primary key
        // For synthetic keys (e.g., '__key'), still use '&__key'
        schema[table] = `&${pk}`
    }

    // If stores already exist with same version, Dexie will throw on re-defining
    // So we guard by checking if stores are defined. We'll version-bump only if needed.
    const currentStores = Object.keys(db._allTables || {})
    const wantedStores = Object.keys(schema)
    const needsDefine = wantedStores.some((s) => !currentStores.includes(s))

    // Detect schema signature changes (e.g., PK switch) using a simple hash persisted in localStorage
    let schemaChanged = false
    try {
        const hash = JSON.stringify(schema)
        const prev = (typeof localStorage !== 'undefined') ? localStorage.getItem('dexieSchemaHash') : null
        schemaChanged = prev !== hash
        if (schemaChanged && typeof localStorage !== 'undefined') {
            localStorage.setItem('dexieSchemaHash', hash)
        }
    } catch { /* ignore storage errors (private mode, etc.) */ }

    if (needsDefine || db.verno === 0 || schemaChanged) {
        // Version must be bumped if db already has a schema
        const nextVersion = Math.max(1, Math.ceil(db.verno) + (db.verno > 0 ? 1 : 0))
        db.version(nextVersion).stores(schema).upgrade(async (tx) => {
            // Migration: puntos_gps primary key changed from '__key' to 'id' (UUID).
            // Ensure every existing row has an 'id'. If missing, synthesize a temporary one from previous __key.
            try {
                const gps = (tx as any).table('puntos_gps')
                if (gps) {
                    await gps.toCollection().modify((obj: any) => {
                        if (!obj.id) {
                            const suffix = obj.__key ? String(obj.__key) : `${Date.now()}-${Math.random()}`
                            obj.id = `temp:${suffix}`
                        }
                    })
                }
            } catch { /* best-effort migration */ }
        })
    }
}

export function getStore(table: string): Table<AnyRow, any> {
    return (db as any)[table] as Table<AnyRow, any>
}
