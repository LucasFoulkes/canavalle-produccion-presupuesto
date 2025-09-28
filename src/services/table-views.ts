import type { TableResult } from './tables'
import { fetchTable } from './tables'

// Pick a subset of keys from each row; missing keys are set to undefined to keep column order consistent
function pickColumns(rows: Array<Record<string, unknown>>, columns: string[]): Array<Record<string, unknown>> {
    return rows.map((row) => {
        const out: Record<string, unknown> = {}
        for (const c of columns) out[c] = (row as any)[c]
        return out
    })
}

// If no explicit columns for a table, infer from the first row
function inferColumns(rows: Array<Record<string, unknown>>): string[] {
    const first = rows[0]
    return first ? Object.keys(first) : []
}

// Default display columns per table. Adjust freely without touching data fetchers.
export const TABLE_VIEW_COLUMNS: Record<string, string[]> = {
    // Core tables
    finca: ['nombre'],
    breeder: ['nombre'],
    patron: ['codigo', 'proveedor'],
    pinche_tipo: ['codigo'],
    grupo_cama_estado: ['codigo'],
    grupo_cama_tipo_planta: ['codigo'],
    usuario: ['nombres', 'apellidos', 'rol', 'cedula'],
    seccion: ['largo_m'],
    puntos_gps: ['capturado_en', 'latitud', 'longitud', 'precision', 'altitud', 'observacion', 'usuario_id'],
    sync: ['id', 'created_at', 'tables'],
    estado_fenologico_tipo: ['codigo', 'orden'],
    // Enriched joins
    bloque: ['finca', 'nombre', 'numero_camas', 'area_m2'],
    cama: ['finca', 'bloque', 'nombre', 'id_grupo', 'largo_metros', 'ancho_metros'],
    variedad: ['nombre', 'color', 'breeder'],
    estados_fenologicos: [
        'finca', 'bloque', 'variedad',
        'dias_brotacion', 'dias_cincuenta_mm', 'dias_quince_cm', 'dias_veinte_cm', 'dias_primera_hoja', 'dias_espiga', 'dias_arroz', 'dias_arveja', 'dias_garbanzo', 'dias_uva', 'dias_rayando_color', 'dias_sepalos_abiertos', 'dias_cosecha'
    ],
    observacion: ['cama', 'tipo_observacion', 'cantidad', 'punto_gps', 'creado_en'],
    pinche: ['bloque', 'cama', 'variedad', 'cantidad', 'tipo', 'created_at'],
    produccion: ['finca', 'bloque', 'variedad', 'cantidad', 'created_at'],
    grupo_cama: ['finca', 'bloque', 'id_bloque', 'id_variedad', 'fecha_siembra', 'estado', 'patron', 'tipo_planta', 'numero_camas', 'total_plantas'],

    // Aggregates: prefer service-provided columns; these are safe fallbacks if not provided
    // Area productiva returns: finca, bloque, variedad, area_productiva_m2, area_total_m2
    area_productiva: ['finca', 'bloque', 'variedad', 'area_productiva_m2', 'area_total_m2'],
    // Observaciones por cama returns dynamic stage columns; we show stable leading columns as fallback
    observaciones_por_cama: ['fecha', 'finca', 'bloque', 'variedad', 'cama', 'seccion', 'area_cama_m2'],
    // Resumen fenológico returns fecha, finca, bloque, variedad + stage columns; fallback to the leading columns
    resumen_fenologico: ['fecha', 'finca', 'bloque', 'variedad'],
}

// Fetch rows for a table and project only the specified (or default) columns for display
export async function fetchTableView(table: string, columns?: string[]): Promise<TableResult> {
    const result = await fetchTable(table)
    const cols = columns ?? result.columns ?? TABLE_VIEW_COLUMNS[table] ?? inferColumns(result.rows)
    const rows = pickColumns(result.rows as Array<Record<string, unknown>>, cols)
    return { rows, columns: cols }
}

// Convenience per-table helpers (optional)
export const tableViews = {
    fetchTableView,
}
