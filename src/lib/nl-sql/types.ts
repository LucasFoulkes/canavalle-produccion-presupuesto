// Deterministic NL→SQL Engine types

export type Tool = 'harvest.aggregate' | 'forecast.stage' | 'gps.points'

export type Grain = 'day' | 'week' | 'month'
export type GroupDim = 'variedad' | 'finca' | 'bloque' | 'cama'

export type OrderDir = 'asc' | 'desc'

export type Catalogs = {
    variedades: string[]
    fincas: string[]
    bloques: string[]
    camas: string[]
}

export type DateRange = { start: string; end: string } // ISO dates YYYY-MM-DD

export type HarvestAggregateArgs = {
    metric: 'cosecha'
    grain?: Grain
    group_by?: GroupDim[]
    filters?: {
        fecha?: string // ISO date
        rango_fecha?: string // "start..end"
        variedad?: string
        finca?: string
        bloque?: string
        cama?: string
    }
    order?: OrderDir
    top_k?: number
}

export type ForecastStageArgs = {
    etapa: string // dias_* enum value
    variedad: string
    fecha: string // ISO date
}

export type GpsPointsArgs = {
    fecha: string // required
    usuario?: string
    horario?: string // HH:MM–HH:MM
    precision_m?: number
    geo_scope?: 'finca' | 'bloque'
    geo_id?: string
}

export type ToolArgs = HarvestAggregateArgs | ForecastStageArgs | GpsPointsArgs

export type QueryDSL = {
    select: Array<{ alias: string; expr: string }>
    grain?: Grain
    group_by?: GroupDim[]
    filters?: {
        fecha?: string
        rango_fecha?: string // start..end
        variedad?: string
        finca?: string
        bloque?: string
        cama?: string
    }
    order_by?: { field: string; dir: OrderDir }
    limit?: number
}

export type SQLResult = {
    sql: string
    params: any[]
}

export type EngineLogs = {
    original: string
    matched_family?: string
    extracted?: Record<string, any>
    validated?: Record<string, any>
    dsl?: QueryDSL | null
    sql?: SQLResult | null
    timings_ms?: Partial<Record<'parse' | 'validate' | 'dsl' | 'compile' | 'total', number>>
}

export type EngineErrorCode =
    | 'INTENT_NOT_FOUND'
    | 'SLOT_RESOLUTION_FAIL'
    | 'SCHEMA_INVALID'
    | 'DSL_UNSUPPORTED'
    | 'SQL_COMPILE_FAIL'

export type EngineSuccess = {
    ok: true
    tool: Tool
    args: ToolArgs
    dsl: QueryDSL | null
    sql: SQLResult | null
    logs: EngineLogs
}

export type EngineFailure = {
    ok: false
    code: EngineErrorCode
    message: string
    logs: EngineLogs
}

export type EngineResult = EngineSuccess | EngineFailure

export type EngineOptions = {
    tz?: string // IANA timezone, default America/Guayaquil
    catalogs?: Partial<Catalogs>
    locale?: 'es' | 'en'
    features?: { classifier?: boolean; retrieval?: boolean; verboseLogs?: boolean }
}
