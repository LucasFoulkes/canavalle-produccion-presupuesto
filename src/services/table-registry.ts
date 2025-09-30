import type { ReactNode } from 'react'

import type { DexieTable } from '@/lib/data-utils'
import { mapByKey, readAll, refreshAllPages, toNumber } from '@/lib/data-utils'
import type { Formatter } from '@/components/data-table'

export type TableResult<T = Record<string, unknown>> = {
    rows: T[]
    columns?: string[]
    caption?: ReactNode
    format?: Record<string, Formatter>
}

export type DependencyConfig = {
    key: string
    table: string
    store: DexieTable<any>
    select?: string
}

export type FetchContext<TBase> = {
    rows: TBase[]
    deps: Record<string, any[]>
    helpers: {
        mapByKey: typeof mapByKey
        toNumber: typeof toNumber
    }
}

export type TableFetcherMeta = {
    columns?: string[]
    caption?: (rows: Array<Record<string, unknown>>) => ReactNode
    format?: Record<string, Formatter>
}

export type TableFetcherConfig<TBase> = {
    key: string
    table: string
    store: DexieTable<TBase>
    select?: string
    dependencies?: DependencyConfig[]
    transform?: (ctx: FetchContext<TBase>) => Promise<Array<Record<string, unknown>>> | Array<Record<string, unknown>>
    meta?: TableFetcherMeta
}

export type TableFetcher = () => Promise<TableResult>

async function refreshSpec(spec: { table: string; store: DexieTable<any>; select?: string }) {
    await refreshAllPages(spec.table, spec.store, spec.select ?? '*')
    return readAll(spec.store)
}

export function defineTableFetcher<TBase>(config: TableFetcherConfig<TBase>): TableFetcher {
    return async function fetchFromConfig(): Promise<TableResult> {
        const rows = await refreshSpec({ table: config.table, store: config.store, select: config.select }) as TBase[]

        let deps: Record<string, any[]> = {}
        if (config.dependencies?.length) {
            const entries: Array<[string, any[]]> = []
            for (const dep of config.dependencies) {
                const data = await refreshSpec({ table: dep.table, store: dep.store, select: dep.select })
                entries.push([dep.key, data])
            }
            deps = Object.fromEntries(entries)
        }

        const helpers = { mapByKey, toNumber }

        let finalRows: Array<Record<string, unknown>>
        if (config.transform) {
            const maybeRows = await config.transform({ rows, deps, helpers })
            finalRows = maybeRows as Array<Record<string, unknown>>
        } else {
            finalRows = rows as unknown as Array<Record<string, unknown>>
        }

        const { columns, caption, format } = config.meta ?? {}
        const result: TableResult = { rows: finalRows }
        if (columns) result.columns = columns
        if (caption) result.caption = caption(finalRows)
        if (format) result.format = format
        return result
    }
}

export function buildRegistry(configs: Array<TableFetcherConfig<unknown>>): Record<string, TableFetcher> {
    const registry: Record<string, TableFetcher> = {}
    for (const cfg of configs) {
        registry[cfg.key] = defineTableFetcher(cfg)
    }
    return registry
}
