import { db } from '@/lib/db'
import type { TableResult } from './tables'
import type { Cama, GrupoCama, Bloque, Finca, Variedad, Observacion, Seccion, EstadoFenologicoTipo } from '@/types/tables'
import * as aq from 'arquero'
import { normText, readAll, refreshAllPages, toNumber } from '@/lib/data-utils'

// Observaciones por Cama, agrupadas también por Sección; lista de estados detectados y área total de la cama
export async function fetchObservacionesPorCama(): Promise<TableResult> {
    await Promise.all([
        refreshAllPages<Cama>('cama', db.cama, '*'),
        refreshAllPages<GrupoCama>('grupo_cama', db.grupo_cama, '*'),
        refreshAllPages<Bloque>('bloque', db.bloque, '*'),
        refreshAllPages<Finca>('finca', db.finca, '*'),
        refreshAllPages<Variedad>('variedad', db.variedad, '*'),
        refreshAllPages<Observacion>('observacion', db.observacion, '*'),
        refreshAllPages<Seccion & { id?: number }>('seccion', db.seccion, '*'),
        refreshAllPages<EstadoFenologicoTipo>('estado_fenologico_tipo', db.estado_fenologico_tipo, '*'),
    ])

    const [camas, grupos, bloques, fincas, variedades, observaciones, secciones, estadosTipo] = await Promise.all([
        readAll<Cama>(db.cama),
        readAll<GrupoCama>(db.grupo_cama),
        readAll<Bloque>(db.bloque),
        readAll<Finca>(db.finca),
        readAll<Variedad>(db.variedad),
        readAll<Observacion>(db.observacion),
        readAll<Seccion & { id?: number }>(db.seccion),
        readAll<EstadoFenologicoTipo>(db.estado_fenologico_tipo),
    ])

    if (!observaciones.length) {
        const stageCols: string[] = estadosTipo
            .slice()
            .sort((a, b) => (a.orden ?? 1e9) - (b.orden ?? 1e9) || a.codigo.localeCompare(b.codigo))
            .map((e) => e.codigo)
        return { rows: [], columns: ['finca', 'bloque', 'variedad', 'cama', 'seccion', ...stageCols, 'area_cama_m2'] }
    }

    const tObs = aq.from(observaciones)
    const tCama = aq.from(camas).rename({ nombre: 'cama_nombre' })
    const tGrupo = aq.from(grupos).rename({ id_bloque: 'grupo_id_bloque', id_variedad: 'grupo_id_variedad' })
    const tBloque = aq.from(bloques).rename({ nombre: 'bloque_nombre', id_finca: 'bloque_id_finca' })
    const tFinca = aq.from(fincas).rename({ nombre: 'finca_nombre' })
    const tVariedad = aq.from(variedades).rename({ nombre: 'variedad_nombre' })

    // seccion largo_m assumed global (single row) for now
    const largoGlobal = secciones.length === 1 ? toNumber(secciones[0]?.largo_m) : 0

    const joined = tObs
        .join_left(tCama, ['id_cama', 'id_cama'])
        .join_left(tGrupo, ['id_grupo', 'id_grupo'])
        .join_left(tBloque, ['grupo_id_bloque', 'id_bloque'])
        .join_left(tFinca, ['bloque_id_finca', 'id_finca'])
        .join_left(tVariedad, ['grupo_id_variedad', 'id_variedad'])
        .derive({
            finca: aq.escape((d: { finca_nombre?: string | null; bloque_id_finca?: number | null }) =>
                d.finca_nombre ?? (d.bloque_id_finca != null ? String(d.bloque_id_finca) : '')
            ),
            bloque: aq.escape((d: { bloque_nombre?: string | null; grupo_id_bloque?: number | null }) =>
                d.bloque_nombre ?? (d.grupo_id_bloque != null ? String(d.grupo_id_bloque) : '')
            ),
            variedad: aq.escape((d: { variedad_nombre?: string | null; grupo_id_variedad?: number | null }) =>
                d.variedad_nombre ?? (d.grupo_id_variedad != null ? String(d.grupo_id_variedad) : '')
            ),
            cama: aq.escape((d: { cama_nombre?: string | null; id_cama?: number | null }) =>
                d.cama_nombre ?? (d.id_cama != null ? String(d.id_cama) : '')
            ),
            seccion: aq.escape((d: { ubicacion_seccion?: string | null }) => (d.ubicacion_seccion ?? '').toString()),
            ancho_m: aq.escape((d: { ancho_metros?: number | string | null }) => toNumber(d.ancho_metros)),
            largo_m: aq.escape(() => largoGlobal),
            estado: aq.escape((d: { tipo_observacion?: string | null }) => (d.tipo_observacion ?? '').toString().trim()),
            cantidad: aq.escape((d: { cantidad?: number | string | null }) => toNumber(d.cantidad)),
        })
        .select('finca', 'bloque', 'variedad', 'cama', 'seccion', 'estado', 'cantidad', 'ancho_m', 'largo_m')

    type Row = { finca: string; bloque: string; variedad: string; cama: string; seccion: string; estado: string; cantidad: number; ancho_m: number; largo_m: number }
    const rows = joined.objects() as Row[]

    // Aggregate per cama (grouping by cama and seccion for estados), compute total area per cama
    const countsByCamaSeccion = new Map<string, Map<string, number>>()
    const areaByCama = new Map<string, number>()

    for (const r of rows) {
        const keyCama = `${r.finca}||${r.bloque}||${r.variedad}||${r.cama}`
        const keyCamaSeccion = `${keyCama}||${r.seccion}`
        // sum cantidades per cama+seccion per normalized estado
        let cmap = countsByCamaSeccion.get(keyCamaSeccion)
        if (!cmap) {
            cmap = new Map<string, number>()
            countsByCamaSeccion.set(keyCamaSeccion, cmap)
        }
        const est = normText(r.estado)
        if (est) cmap.set(est, (cmap.get(est) ?? 0) + toNumber(r.cantidad))

        // total area per cama = ancho * largo (not multiplied per observation)
        const area = toNumber(r.ancho_m) * toNumber(r.largo_m)
        // Keep max in case of multiple observations
        areaByCama.set(keyCama, Math.max(areaByCama.get(keyCama) ?? 0, area))
    }

    // Flatten to rows: one row per cama per seccion with estados, and include total area per cama
    // Build stage columns definition
    const stageList = estadosTipo
        .slice()
        .sort((a, b) => (a.orden ?? 1e9) - (b.orden ?? 1e9) || a.codigo.localeCompare(b.codigo))
    const stageCols = stageList.map((e) => e.codigo)

    const result: Array<Record<string, unknown>> = []
    for (const [keyCamaSeccion, countsMap] of countsByCamaSeccion.entries()) {
        const [finca, bloque, variedad, cama, seccion] = keyCamaSeccion.split('||')
        const keyCama = `${finca}||${bloque}||${variedad}||${cama}`
        const row: Record<string, unknown> = {
            finca,
            bloque,
            variedad,
            cama,
            seccion,
            area_cama_m2: areaByCama.get(keyCama) ?? 0,
        }
        for (const stage of stageList) {
            const codeNorm = normText(stage.codigo)
            const codeAlt = normText(stage.codigo.split('_').join(' '))
            const v1 = countsMap.get(codeNorm) ?? 0
            const v2 = codeAlt === codeNorm ? 0 : (countsMap.get(codeAlt) ?? 0)
            row[stage.codigo] = v1 + v2
        }
        result.push(row)
    }

    return {
        rows: result, columns: ['finca',
            'bloque',
            'variedad',
            'cama',
            'seccion',
            'arroz',
            'arveja',
            'garbanzo',
            'uva',
            'rayando_color',
            'sepalos_abiertos',
            'cosecha',
            'area_cama_m2']
    }
}
