import { EngineFailure, EngineOptions, EngineResult, QueryDSL, SQLResult, Tool, ToolArgs } from './types'
import { Registry } from './registry'
import { parseDateOrRange } from './dates'
import { makeEntityResolver } from './entities'

function nowMs() { return Date.now() }

function ok<T>(x: T) { return { ok: true as const, ...x } }
function fail(code: EngineFailure['code'], message: string, logs: any): EngineFailure { return { ok: false, code, message, logs } }

// Simple rule-based intent mapping
function matchFamily(q: string): { family?: string; tool?: Tool } {
    const s = q.toLowerCase()
    if (/gps|mapa|ubicaci[óo]n|puntos/.test(s)) return { family: 'gps.points.basic', tool: 'gps.points' }
    if (/proyectad[oa]|etapa|dias_/.test(s)) return { family: 'forecast.stage.basic', tool: 'forecast.stage' }
    // default to harvest aggregate for cosecha/total/variedad
    if (/cosecha|total|variedad|bloque|finca|cama|semana|d[ií]a|mes/.test(s)) return { family: 'harvest.aggregate.basic', tool: 'harvest.aggregate' }
    return {}
}

// Build DSL for harvest.aggregate
function buildHarvestDSL(slots: any): QueryDSL {
    const grain = slots.grain as QueryDSL['grain'] | undefined
    const group_by = slots.group_by as QueryDSL['group_by'] | undefined
    const filters = slots.filters as NonNullable<QueryDSL['filters']>
    const dsl: QueryDSL = {
        select: [{ alias: 'total_cosecha', expr: 'SUM(cantidad)' }],
        grain,
        group_by,
        filters,
        order_by: { field: 'total_cosecha', dir: (slots.order || 'desc') },
        limit: slots.top_k,
    }
    return dsl
}

// Compile to parameterized SQL over cosecha
function compileHarvestSQL(dsl: QueryDSL): SQLResult {
    const where: string[] = []
    const params: any[] = []
    if (dsl.filters?.fecha) { where.push('fecha = ?'); params.push(dsl.filters.fecha) }
    if (dsl.filters?.rango_fecha) {
        const [start, end] = dsl.filters.rango_fecha.split('..')
        where.push('fecha BETWEEN ? AND ?'); params.push(start, end)
    }
    if (dsl.filters?.variedad) { where.push('variedad = ?'); params.push(dsl.filters.variedad) }
    if (dsl.filters?.finca) { where.push('finca = ?'); params.push(dsl.filters.finca) }
    if (dsl.filters?.bloque) { where.push('bloque = ?'); params.push(dsl.filters.bloque) }
    if (dsl.filters?.cama) { where.push('cama = ?'); params.push(dsl.filters.cama) }

    const selectParts = ['SUM(cantidad) AS total_cosecha']
    const groupCols: string[] = []
    if (dsl.grain === 'day') groupCols.push('fecha')
    if (dsl.grain === 'week') groupCols.push("strftime('%Y-%W', fecha) AS week")
    if (dsl.grain === 'month') groupCols.push("strftime('%Y-%m', fecha) AS month")
    const dims = dsl.group_by || []
    groupCols.push(...dims)

    const from = 'FROM cosecha'
    const whereSql = where.length ? 'WHERE ' + where.join(' AND ') : ''
    const groupSql = groupCols.length ? 'GROUP BY ' + groupCols.map(c => c.includes(' AS ') ? c.split(' AS ')[1] : c).join(', ') : ''
    const orderSql = dsl.order_by ? `ORDER BY ${dsl.order_by.field} ${dsl.order_by.dir?.toUpperCase()}` : ''
    const limitSql = dsl.limit ? `LIMIT ${Number(dsl.limit)}` : ''

    const selectSql = 'SELECT ' + [
        ...groupCols.map(c => c.includes(' AS ') ? c : `${c}`),
        selectParts[0],
    ].join(', ')

    const sql = [selectSql, from, whereSql, groupSql, orderSql, limitSql].filter(Boolean).join(' ')
    return { sql, params }
}

// Extract slots deterministically with simple regex/keywords
function extractSlots(tool: Tool, q: string, options: EngineOptions) {
    const logs: any = { stage: 'extract', tool }
    const out: any = { filters: {} }
    // dates
    const date = parseDateOrRange(q)
    if (date?.fecha) out.filters.fecha = date.fecha
    if (date?.rango_fecha) out.filters.rango_fecha = date.rango_fecha

    // grain
    if (/semana|weekly/.test(q.toLowerCase())) out.grain = 'week'
    else if (/mes|mensual|monthly/.test(q.toLowerCase())) out.grain = 'month'
    else if (/d[ií]a|diario|daily/.test(q.toLowerCase())) out.grain = 'day'

    // grouping defaults handled by registry; here we allow phrases like "por variedad|finca|bloque|cama"
    const groupDims: string[] = []
    if (/por\s+variedad/.test(q)) groupDims.push('variedad')
    if (/por\s+finca/.test(q)) groupDims.push('finca')
    if (/por\s+bloque/.test(q)) groupDims.push('bloque')
    if (/por\s+cama/.test(q)) groupDims.push('cama')
    if (groupDims.length) out.group_by = groupDims

    // order & top_k
    if (/asc(endente)?/.test(q)) out.order = 'asc'
    if (/desc(endente)?|rank|top|mejores|peores/.test(q)) out.order = 'desc'
    const topk = q.match(/\b(top|mejores|peores)\s+(\d+)/i)
    if (topk) out.top_k = Number(topk[2])

    // entities via catalogs (fuzzy)
    const resolver = makeEntityResolver(options.catalogs || {})
    const entMatches = q.match(/variedad\s+([\p{L}\s\-]+)/iu)
    if (entMatches && entMatches[1]) {
        const r = resolver.variedad(entMatches[1].trim())
        if (r.value) out.filters.variedad = r.value
    }
    const fincaM = q.match(/finca\s+([\p{L}\s\-]+)/iu)
    if (fincaM && fincaM[1]) {
        const r = resolver.finca(fincaM[1].trim())
        if (r.value) out.filters.finca = r.value
    }
    const bloqueM = q.match(/bloque\s+([\p{L}\s\-]+)/iu)
    if (bloqueM && bloqueM[1]) {
        const r = resolver.bloque(bloqueM[1].trim())
        if (r.value) out.filters.bloque = r.value
    }
    const camaM = q.match(/cama\s+([\p{L}\s\-]+)/iu)
    if (camaM && camaM[1]) {
        const r = resolver.cama(camaM[1].trim())
        if (r.value) out.filters.cama = r.value
    }

    return { slots: out, logs }
}

export async function analyzeQuestion(question: string, options: EngineOptions = {}): Promise<EngineResult> {
    const t0 = nowMs()
    const logs: any = { original: question }
    const { family, tool } = matchFamily(question)
    logs.matched_family = family
    if (!tool) return fail('INTENT_NOT_FOUND', 'No reconocí el tipo de pregunta. Usa una plantilla conocida o sé más específico.', logs)

    const tParse0 = nowMs()
    const { slots } = extractSlots(tool, question, options)
    logs.extracted = slots
    const tParse1 = nowMs()

    // Fill defaults and validate according to registry
    const spec = Registry[tool]
    let args: any = { ...(spec.defaults || {}), ...(tool === 'harvest.aggregate' ? { metric: 'cosecha' } : {}), ...slots }
    const validated = spec.validate(args)
    if (!validated.ok) return validated
    args = validated.args as ToolArgs
    logs.validated = args

    let dsl: QueryDSL | null = null
    let sql: SQLResult | null = null
    const tDsl0 = nowMs()
    if (tool === 'harvest.aggregate') {
        dsl = buildHarvestDSL(args)
    }
    const tDsl1 = nowMs()

    const tSql0 = nowMs()
    if (tool === 'harvest.aggregate' && dsl) {
        sql = compileHarvestSQL(dsl)
    }
    const tSql1 = nowMs()

    const t1 = nowMs()
    logs.dsl = dsl
    logs.sql = sql
    logs.timings_ms = { parse: tParse1 - tParse0, dsl: tDsl1 - tDsl0, compile: tSql1 - tSql0, total: t1 - t0 }

    return ok({ tool, args, dsl, sql, logs })
}
