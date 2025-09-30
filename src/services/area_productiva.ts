import { db } from '@/lib/db'
import type { TableResult } from './tables'
import type { Cama, GrupoCama, Bloque, Finca, Variedad } from '@/types/tables'
import * as aq from 'arquero'
import { normText, readAll, refreshAllPages, toNumber } from '@/lib/data-utils'

// Área productiva por Finca–Bloque–Variedad
export async function fetchAreaProductiva(): Promise<TableResult> {
    // Best-effort cache refresh
    await refreshAllPages<Cama>('cama', db.cama, '*')
    await refreshAllPages<GrupoCama>('grupo_cama', db.grupo_cama, '*')
    await refreshAllPages<Bloque>('bloque', db.bloque, '*')
    await refreshAllPages<Finca>('finca', db.finca, '*')
    await refreshAllPages<Variedad>('variedad', db.variedad, '*')

    const [camas, grupos, bloques, fincas, variedades] = await Promise.all([
        readAll<Cama>(db.cama),
        readAll<GrupoCama>(db.grupo_cama),
        readAll<Bloque>(db.bloque),
        readAll<Finca>(db.finca),
        readAll<Variedad>(db.variedad),
    ])

    if (!camas.length) {
        return { rows: [], columns: ['finca', 'bloque', 'variedad', 'area_productiva_m2'] }
    }

    const tCama = aq.from(camas)
    const safeRename = <T extends Record<string, any>>(rows: T[], mapping: Record<string, string>) => {
        const t = aq.from(rows)
        const first = rows?.[0] ?? {}
        const out: Record<string, string> = {}
        for (const [src, dst] of Object.entries(mapping)) {
            if (Object.prototype.hasOwnProperty.call(first, src)) out[src] = dst
        }
        return Object.keys(out).length ? t.rename(out) : t
    }

    const tGrupo = safeRename(grupos, { id_bloque: 'grupo_id_bloque', id_variedad: 'grupo_id_variedad', estado: 'grupo_estado' })
    const tBloque = safeRename(bloques, { nombre: 'bloque_nombre', id_finca: 'bloque_id_finca' })
    const tFinca = safeRename(fincas, { nombre: 'finca_nombre' })
    const tVariedad = safeRename(variedades, { nombre: 'variedad_nombre' })

    const derived = tCama
        .join_left(tGrupo, ['id_grupo', 'id_grupo'])
        .join_left(tBloque, ['grupo_id_bloque', 'id_bloque'])
        .join_left(tFinca, ['bloque_id_finca', 'id_finca'])
        .join_left(tVariedad, ['grupo_id_variedad', 'id_variedad'])
        .derive({
            // Determine if cama is in productive state based on its group's estado code
            is_productivo: aq.escape((d: { grupo_estado?: string | null }) => normText(d.grupo_estado) === 'productivo'),
            // base area per cama (regardless of estado)
            area_m2: aq.escape((d: { largo_metros?: number | string | null; ancho_metros?: number | string | null }) =>
                toNumber(d.largo_metros) * toNumber(d.ancho_metros)
            ),
            finca: aq.escape((d: { finca_nombre?: string | null; bloque_id_finca?: number | null }) =>
                d.finca_nombre ?? (d.bloque_id_finca != null ? String(d.bloque_id_finca) : '')
            ),
            bloque: aq.escape((d: { bloque_nombre?: string | null; grupo_id_bloque?: number | null }) =>
                d.bloque_nombre ?? (d.grupo_id_bloque != null ? String(d.grupo_id_bloque) : '')
            ),
            variedad: aq.escape((d: { variedad_nombre?: string | null; grupo_id_variedad?: number | null }) =>
                d.variedad_nombre ?? (d.grupo_id_variedad != null ? String(d.grupo_id_variedad) : '')
            ),
        })
        // don't filter yet; we need both totals and productiva in aggregation
        .select('finca', 'bloque', 'variedad', 'area_m2', 'is_productivo')

    // Aggregate in TypeScript to keep strict types and avoid loosely typed aggregators in Arquero
    type Row = { finca: string; bloque: string; variedad: string; area_m2: number; is_productivo: boolean }
    const objects = derived.objects() as Row[]
    const byKey = new Map<string, { finca: string; bloque: string; variedad: string; area_productiva_m2: number; area_total_m2: number }>()
    for (const r of objects) {
        const key = `${r.finca}||${r.bloque}||${r.variedad}`
        const current = byKey.get(key)
        if (!current) {
            byKey.set(key, { finca: r.finca, bloque: r.bloque, variedad: r.variedad, area_productiva_m2: 0, area_total_m2: 0 })
        }
        const agg = byKey.get(key)!
        agg.area_total_m2 += r.area_m2
        if (r.is_productivo) {
            agg.area_productiva_m2 += r.area_m2
        }
    }
    const rows = Array.from(byKey.values()) as Array<Record<string, unknown>>
    return { rows, columns: ['finca', 'bloque', 'variedad', 'area_productiva_m2', 'area_total_m2'] }
}
