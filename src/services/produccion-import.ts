import * as XLSX from 'xlsx'
import { format, parse } from 'date-fns'
import { supabase } from '@/lib/supabase'
import { normText, toNumber } from '@/lib/data-utils'

export type ProduccionFileType = 'REPORTE_RECEPCION' | 'HISTORICO'

export type ParsedProduccionRow = {
    fecha: string
    fincaNombre: string
    bloqueNombre: string
    variedadNombre: string
    cantidad: number
}

export type ResolvedProduccionRow = ParsedProduccionRow & {
    fincaId: number
    bloqueId: number
    variedadId: number
}

export type LookupError = {
    row: ParsedProduccionRow
    error: string
}

export type DuplicateRow = {
    row: ResolvedProduccionRow
    status: 'DUPLICATE' | 'CONFLICT'
    message: string
    existingCantidad?: number
    newCantidad: number
    existingId?: number
}

export type ProduccionImportResult = {
    fileName: string
    fileType: ProduccionFileType
    totalRows: number
    transformedRows: ParsedProduccionRow[]
    lookupErrors: LookupError[]
    duplicateRows: DuplicateRow[]
    rowsToInsert: ResolvedProduccionRow[]
}

type TableData = {
    name: string
    rows: Array<Record<string, unknown>>
    headers: string[]
}

type SupabaseClient = typeof supabase

function readWorkbook(file: File): Promise<XLSX.WorkBook> {
    return new Promise((resolve, reject) => {
        const reader = new FileReader()
        reader.onerror = () => reject(reader.error)
        reader.onload = () => {
            try {
                const data = reader.result as ArrayBuffer
                const workbook = XLSX.read(data, { type: 'array' })
                resolve(workbook)
            } catch (err) {
                reject(err)
            }
        }
        reader.readAsArrayBuffer(file)
    })
}

function workbookToTables(workbook: XLSX.WorkBook): TableData[] {
    const tables: TableData[] = []
    for (const sheetName of workbook.SheetNames) {
        const sheet = workbook.Sheets[sheetName]
        if (!sheet) continue
        const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, {
            defval: null,
        })
        if (!rows.length) continue
        const headers = Object.keys(rows[0] ?? {})
        tables.push({ name: sheetName, rows, headers })
    }
    return tables
}

function detectFileType(tables: TableData[]): { type: ProduccionFileType; table: TableData } {
    for (const table of tables) {
        const headerSet = new Set(table.headers.map((h) => normText(String(h))))
        if (headerSet.has('block/variety')) {
            return { type: 'REPORTE_RECEPCION', table }
        }
        if ((headerSet.has('date') || headerSet.has('fecha')) && (headerSet.has('location') || headerSet.has('block'))) {
            return { type: 'HISTORICO', table }
        }
    }
    throw new Error('Formato de archivo desconocido: no se encontraron columnas esperadas')
}

function extractBlockCode(value: string): string {
    const trimmed = String(value ?? '').trim()
    if (!trimmed) return ''
    const firstPart = trimmed.split(/\s+/)[0]
    return firstPart
}

function removePrefix(value: string, prefix: string): string {
    if (value.toLowerCase().startsWith(prefix.toLowerCase())) {
        return value.slice(prefix.length)
    }
    return value
}

function normalizeDate(input: unknown): string | null {
    const raw = String(input ?? '').trim()
    if (!raw) return null
    if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) return raw
    const candidates = ['MM/dd/yyyy', 'MM-dd-yyyy', 'dd/MM/yyyy', 'dd-MM-yyyy'] as const
    for (const pattern of candidates) {
        const parsed = parse(raw, pattern, new Date())
        if (!Number.isNaN(parsed.getTime())) {
            return format(parsed, 'yyyy-MM-dd')
        }
    }
    // Attempt ISO date with time
    const parsed = new Date(raw)
    if (!Number.isNaN(parsed.getTime())) {
        return format(parsed, 'yyyy-MM-dd')
    }
    return null
}

function extractDateFromFilename(filename: string): string | null {
    const match = filename.match(/(\d{4}-\d{2}-\d{2})/)
    if (match) return match[1]
    const matchAlt = filename.match(/(\d{2})[-_](\d{2})[-_](\d{4})/)
    if (matchAlt) {
        const [, mm, dd, yyyy] = matchAlt
        return `${yyyy}-${mm}-${dd}`
    }
    return null
}

function normalizeRowKeys(row: Record<string, unknown>): Map<string, unknown> {
    const map = new Map<string, unknown>()
    for (const [key, value] of Object.entries(row)) {
        const normKey = normText(String(key))
        if (!map.has(normKey)) {
            map.set(normKey, value)
        }
    }
    return map
}

function transformReporteRecepcion(file: File, table: TableData): ParsedProduccionRow[] {
    const rows: ParsedProduccionRow[] = []
    const fallbackFecha = extractDateFromFilename(file.name) ?? format(new Date(), 'yyyy-MM-dd')
    let currentBloque = ''

    for (const rawRow of table.rows) {
        const normalized = normalizeRowKeys(rawRow)
        const blockVarietyRaw = normalized.get('block/variety') ?? normalized.get('block / variety')
        if (!blockVarietyRaw) continue
        const blockVariety = String(blockVarietyRaw).trim()
        if (!blockVariety) continue

        const stemsValue = normalized.get('stems') ?? normalized.get('stems total') ?? normalized.get('qty')
        const stems = toNumber(stemsValue)

        if (normText(blockVariety).includes('todo')) {
            const blockCode = extractBlockCode(blockVariety)
            currentBloque = removePrefix(blockCode, 'BC')
            continue
        }

        if (!currentBloque) continue
        if (!Number.isFinite(stems) || stems <= 0) continue

        rows.push({
            fecha: fallbackFecha,
            fincaNombre: 'CANANVALLE',
            bloqueNombre: currentBloque,
            variedadNombre: blockVariety,
            cantidad: stems,
        })
    }

    return rows
}

function transformHistorico(table: TableData): ParsedProduccionRow[] {
    const rows: ParsedProduccionRow[] = []

    for (const rawRow of table.rows) {
        const normalized = normalizeRowKeys(rawRow)
        const dateValue = normalized.get('date') ?? normalized.get('fecha')
        const fecha = normalizeDate(dateValue)
        if (!fecha) continue

        const blockRaw = normalized.get('block') ?? normalized.get('location') ?? normalized.get('bloque')
        const varietyRaw = normalized.get('variety') ?? normalized.get('variedad')
        const cantidadRaw = normalized.get('s1 receiving') ?? normalized.get('s1 recepcion') ?? normalized.get('cantidad') ?? normalized.get('qty')

        if (!blockRaw || !varietyRaw) continue

        const cantidad = toNumber(cantidadRaw)
        if (!Number.isFinite(cantidad) || cantidad <= 0) continue

        const block = removePrefix(String(blockRaw).trim(), 'BC')

        rows.push({
            fecha,
            fincaNombre: 'CANANVALLE',
            bloqueNombre: block,
            variedadNombre: String(varietyRaw ?? '').trim(),
            cantidad,
        })
    }

    return rows
}

async function fetchLookups(client: SupabaseClient) {
    const [{ data: fincaData, error: fincaError }, { data: bloqueData, error: bloqueError }, { data: variedadData, error: variedadError }] = await Promise.all([
        client.from('finca').select('id_finca, nombre, eliminado_en'),
        client.from('bloque').select('id_bloque, nombre, eliminado_en'),
        client.from('variedad').select('id_variedad, nombre, eliminado_en'),
    ])

    if (fincaError) throw fincaError
    if (bloqueError) throw bloqueError
    if (variedadError) throw variedadError

    const fincas = new Map<string, number>()
    for (const row of fincaData ?? []) {
        if (row.eliminado_en) continue
        const name = String(row.nombre ?? '')
        if (!name) continue
        fincas.set(normText(name), row.id_finca)
    }

    const bloques = new Map<string, number>()
    for (const row of bloqueData ?? []) {
        if (row.eliminado_en) continue
        const name = String(row.nombre ?? '')
        if (!name) continue
        const normName = normText(name)
        if (!bloques.has(normName)) bloques.set(normName, row.id_bloque)
        const withoutPrefix = normText(removePrefix(name, 'BC'))
        if (withoutPrefix && !bloques.has(withoutPrefix)) bloques.set(withoutPrefix, row.id_bloque)
    }

    const variedades = new Map<string, number>()
    for (const row of variedadData ?? []) {
        if (row.eliminado_en) continue
        const name = String(row.nombre ?? '')
        if (!name) continue
        const key = normText(name)
        if (!variedades.has(key)) variedades.set(key, row.id_variedad)
    }

    return { fincas, bloques, variedades }
}

async function findExistingProduccion(client: SupabaseClient, row: ResolvedProduccionRow) {
    const fromDate = `${row.fecha}T00:00:00`
    const toDate = `${row.fecha}T23:59:59`
    const query = client
        .from('produccion')
        .select('id, cantidad')
        .eq('finca', row.fincaId)
        .eq('bloque', row.bloqueId)
        .eq('variedad', row.variedadId)
        .gte('created_at', fromDate)
        .lte('created_at', toDate)
        .limit(1)

    const { data, error } = await query
    if (error) {
        if (error?.details?.includes('0 rows')) return null
        throw error
    }
    if (!data || !data.length) return null
    return data[0]
}

export async function processProduccionFile(file: File, client: SupabaseClient = supabase): Promise<ProduccionImportResult> {
    const workbook = await readWorkbook(file)
    const tables = workbookToTables(workbook)
    if (!tables.length) {
        throw new Error('El archivo no contiene tablas procesables')
    }

    const { type, table } = detectFileType(tables)
    const transformedRows = type === 'REPORTE_RECEPCION' ? transformReporteRecepcion(file, table) : transformHistorico(table)

    const lookupErrors: LookupError[] = []
    const duplicateRows: DuplicateRow[] = []
    const rowsToInsert: ResolvedProduccionRow[] = []

    if (!transformedRows.length) {
        return {
            fileName: file.name,
            fileType: type,
            totalRows: 0,
            transformedRows,
            lookupErrors,
            duplicateRows,
            rowsToInsert,
        }
    }

    const lookups = await fetchLookups(client)

    for (const row of transformedRows) {
        const fincaId = lookups.fincas.get(normText(row.fincaNombre))
        if (!fincaId) {
            lookupErrors.push({ row, error: `Finca no encontrada: ${row.fincaNombre}` })
            continue
        }

        const bloqueId = lookups.bloques.get(normText(row.bloqueNombre))
        if (!bloqueId) {
            lookupErrors.push({ row, error: `Bloque no encontrado: ${row.bloqueNombre}` })
            continue
        }

        const variedadId = lookups.variedades.get(normText(row.variedadNombre))
        if (!variedadId) {
            lookupErrors.push({ row, error: `Variedad no encontrada: ${row.variedadNombre}` })
            continue
        }

        const resolved: ResolvedProduccionRow = {
            ...row,
            fincaId,
            bloqueId,
            variedadId,
        }

        try {
            const existing = await findExistingProduccion(client, resolved)
            if (existing) {
                if (toNumber(existing.cantidad) !== toNumber(row.cantidad)) {
                    duplicateRows.push({
                        row: resolved,
                        status: 'CONFLICT',
                        message: 'Existe un registro con cantidad distinta',
                        existingCantidad: toNumber(existing.cantidad),
                        newCantidad: toNumber(row.cantidad),
                        existingId: existing.id,
                    })
                } else {
                    duplicateRows.push({
                        row: resolved,
                        status: 'DUPLICATE',
                        message: 'Registro idéntico ya existe',
                        existingCantidad: toNumber(existing.cantidad),
                        newCantidad: toNumber(row.cantidad),
                        existingId: existing.id,
                    })
                }
            } else {
                rowsToInsert.push(resolved)
            }
        } catch (error: any) {
            duplicateRows.push({
                row: resolved,
                status: 'CONFLICT',
                message: `Error verificando duplicados: ${error?.message ?? error}`,
                newCantidad: toNumber(row.cantidad),
            })
        }
    }

    return {
        fileName: file.name,
        fileType: type,
        totalRows: transformedRows.length,
        transformedRows,
        lookupErrors,
        duplicateRows,
        rowsToInsert,
    }
}
