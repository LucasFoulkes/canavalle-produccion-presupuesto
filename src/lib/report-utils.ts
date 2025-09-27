import * as aq from 'arquero'
import { normText, toNumber } from '@/lib/data-utils'
import type { Cama, GrupoCama, Bloque, Finca, Variedad, Observacion, EstadoFenologicoTipo, EstadosFenologicos } from '@/types/tables'

// FBV helpers
export function fbvKeyFromNames(finca?: string | null, bloque?: string | null, variedad?: string | null): string {
    return `${finca ?? ''}||${bloque ?? ''}||${variedad ?? ''}`
}
export function parseFBVKey(key: string): { finca: string; bloque: string; variedad: string } {
    const [finca, bloque, variedad] = key.split('||')
    return { finca: finca ?? '', bloque: bloque ?? '', variedad: variedad ?? '' }
}
export function buildNameMaps(
    fincas: Finca[],
    bloques: Bloque[],
    variedades: Variedad[],
): {
    fincaNameById: Map<string, string>
    bloqueNameById: Map<string, string>
    variedadNameById: Map<string, string>
} {
    const fincaNameById = new Map<string, string>()
    for (const f of fincas) {
        const id = (f as any).id_finca != null ? String((f as any).id_finca) : ''
        const name = (f as any).nombre ?? id
        if (id) fincaNameById.set(id, String(name))
    }
    const bloqueNameById = new Map<string, string>()
    for (const b of bloques) {
        const id = (b as any).id_bloque != null ? String((b as any).id_bloque) : ''
        const name = (b as any).nombre ?? id
        if (id) bloqueNameById.set(id, String(name))
    }
    const variedadNameById = new Map<string, string>()
    for (const v of variedades) {
        const id = (v as any).id_variedad != null ? String((v as any).id_variedad) : ''
        const name = (v as any).nombre ?? id
        if (id) variedadNameById.set(id, String(name))
    }
    return { fincaNameById, bloqueNameById, variedadNameById }
}

// Stage metadata
export function getStageList(estadosTipo: EstadoFenologicoTipo[]) {
    return estadosTipo
        .slice()
        .sort((a, b) => (a.orden ?? 1e9) - (b.orden ?? 1e9) || String(a.codigo).localeCompare(String(b.codigo)))
}
export function getDiasFieldByCode(): Record<string, keyof EstadosFenologicos> {
    return {
        brotacion: 'dias_brotacion' as keyof EstadosFenologicos,
        '50mm': 'dias_cincuenta_mm' as keyof EstadosFenologicos,
        quince_cm: 'dias_quince_cm' as keyof EstadosFenologicos,
        '15cm': 'dias_quince_cm' as keyof EstadosFenologicos,
        '20cm': 'dias_veinte_cm' as keyof EstadosFenologicos,
        veinte_cm: 'dias_veinte_cm' as keyof EstadosFenologicos,
        primera_hoja: 'dias_primera_hoja' as keyof EstadosFenologicos,
        espiga: 'dias_espiga' as keyof EstadosFenologicos,
        arroz: 'dias_arroz' as keyof EstadosFenologicos,
        arveja: 'dias_arveja' as keyof EstadosFenologicos,
        garbanzo: 'dias_garbanzo' as keyof EstadosFenologicos,
        uva: 'dias_uva' as keyof EstadosFenologicos,
        rayando_color: 'dias_rayando_color' as keyof EstadosFenologicos,
        sepalos_abiertos: 'dias_sepalos_abiertos' as keyof EstadosFenologicos,
        cosecha: 'dias_cosecha' as keyof EstadosFenologicos,
    } as any
}
export function durationsFromRow(row: EstadosFenologicos | undefined, stageList: EstadoFenologicoTipo[]): Map<string, number> {
    const diasFieldByCode = getDiasFieldByCode()
    const map = new Map<string, number>()
    for (const st of stageList) {
        const codeNorm = normText(String(st.codigo))
        const field = diasFieldByCode[codeNorm]
        const raw = row && field ? (row as any)[field] : null
        let dur = Number.isFinite(toNumber(raw)) ? Math.round(Math.max(1, toNumber(raw))) : NaN
        if (!Number.isFinite(dur)) dur = 1
        map.set(codeNorm, dur)
    }
    return map
}

// Observations normalization
export type NormalizedObs = {
    finca: string
    bloque: string
    variedad: string
    cama: string
    seccion: string
    fecha: string // YYYY-MM-DD
    estado_norm: string
    cantidad: number
    ancho_m: number
    largo_m: number
}
export function normalizeObservaciones(
    datasets: {
        camas: Cama[]
        grupos: GrupoCama[]
        bloques: Bloque[]
        fincas: Finca[]
        variedades: Variedad[]
        observaciones: Observacion[]
    }
): NormalizedObs[] {
    const { camas, grupos, bloques, fincas, variedades, observaciones } = datasets
    if (!observaciones?.length) return []
    const tObs = aq.from(observaciones).rename({ creado_en: 'obs_creado_en' })
    const tCama = aq.from(camas).rename({ nombre: 'cama_nombre' })
    const tGrupo = aq.from(grupos).rename({ id_bloque: 'grupo_id_bloque', id_variedad: 'grupo_id_variedad' })
    const tBloque = aq.from(bloques).rename({ nombre: 'bloque_nombre', id_finca: 'bloque_id_finca' })
    const tFinca = aq.from(fincas).rename({ nombre: 'finca_nombre' })
    const tVariedad = aq.from(variedades).rename({ nombre: 'variedad_nombre' })

    const joined = tObs
        .join_left(tCama, ['id_cama', 'id_cama'])
        .join_left(tGrupo, ['id_grupo', 'id_grupo'])
        .join_left(tBloque, ['grupo_id_bloque', 'id_bloque'])
        .join_left(tFinca, ['bloque_id_finca', 'id_finca'])
        .join_left(tVariedad, ['grupo_id_variedad', 'id_variedad'])
        .derive({
            finca: aq.escape((d: any) => d.finca_nombre ?? (d.bloque_id_finca != null ? String(d.bloque_id_finca) : '')),
            bloque: aq.escape((d: any) => d.bloque_nombre ?? (d.grupo_id_bloque != null ? String(d.grupo_id_bloque) : '')),
            variedad: aq.escape((d: any) => d.variedad_nombre ?? (d.grupo_id_variedad != null ? String(d.grupo_id_variedad) : '')),
            cama: aq.escape((d: any) => d.cama_nombre ?? (d.id_cama != null ? String(d.id_cama) : '')),
            seccion: aq.escape((d: any) => (d.ubicacion_seccion ?? '').toString()),
            ancho_m: aq.escape((d: any) => toNumber(d.ancho_metros)),
            largo_m: aq.escape((d: any) => toNumber(d.largo_metros)),
            estado_norm: aq.escape((d: any) => normText((d.tipo_observacion ?? '').toString().trim())),
            cantidad: aq.escape((d: any) => toNumber(d.cantidad)),
            fecha: aq.escape((d: any) => {
                const raw = d.obs_creado_en ?? ''
                const s = raw.toString()
                const m = s.match(/^(\d{4}-\d{2}-\d{2})/)
                if (m) return m[1]
                const t = Date.parse(s)
                if (Number.isFinite(t)) return new Date(t).toISOString().slice(0, 10)
                return ''
            }),
        })
        .select('finca', 'bloque', 'variedad', 'cama', 'seccion', 'fecha', 'estado_norm', 'cantidad', 'ancho_m', 'largo_m')

    return joined.objects() as NormalizedObs[]
}

// Sections parser and area contribution
export function countSections(ubicacion: string | null | undefined): number {
    const s = (ubicacion ?? '').trim()
    if (!s) return 1
    let count = 0
    const seen = new Set<number>()
    for (const part of s.split(/[,;\s]+/)) {
        if (!part) continue
        const m = part.match(/^(\d+)-(\d+)$/)
        if (m) {
            const a = parseInt(m[1], 10)
            const b = parseInt(m[2], 10)
            const [start, end] = a <= b ? [a, b] : [b, a]
            for (let k = start; k <= end; k++) {
                if (!seen.has(k)) { seen.add(k); count++ }
            }
            continue
        }
        const n = parseInt(part, 10)
        if (Number.isFinite(n) && n > 0 && !seen.has(n)) { seen.add(n); count++ }
    }
    return count || 1
}
export function computeAreaForObs(row: Pick<NormalizedObs, 'seccion' | 'ancho_m' | 'largo_m'>, seccionLargo: number): number {
    const sections = countSections(row.seccion)
    const ancho = toNumber(row.ancho_m)
    const largoCama = toNumber(row.largo_m)
    const seccionStr = (row.seccion ?? '').toString().trim()
    const perSectionLen = seccionLargo || 0
    const areaObs = seccionStr ? (ancho * (sections * (perSectionLen || 1))) : (ancho * (largoCama || 1))
    return areaObs
}

// Inflow builder
export type Payload = { count: number; area_m2: number }
export function buildInflowByFBVDateStage(
    normalized: NormalizedObs[],
    seccionLargo: number
): Map<string, Map<string, Map<string, Payload>>> {
    const inflow: Map<string, Map<string, Map<string, Payload>>> = new Map()
    for (const r of normalized) {
        if (!r.fecha) continue
        const fbv = fbvKeyFromNames(r.finca, r.bloque, r.variedad)
        const date = r.fecha
        const stage = r.estado_norm
        if (!stage) continue
        if (!inflow.has(fbv)) inflow.set(fbv, new Map())
        const byDate = inflow.get(fbv)!
        if (!byDate.has(date)) byDate.set(date, new Map())
        const byStage = byDate.get(date)!
        if (!byStage.has(stage)) byStage.set(stage, { count: 0, area_m2: 0 })
        const p = byStage.get(stage)!
        p.count += toNumber(r.cantidad)
        p.area_m2 += computeAreaForObs(r, seccionLargo)
    }
    return inflow
}

// Areas helper: convert area_productiva rows into Maps
export function toAreaMaps(areaRows: Array<Record<string, any>>): {
    areaTotalByFBV: Map<string, number>
    areaProdByFBV: Map<string, number>
} {
    const areaTotalByFBV = new Map<string, number>()
    const areaProdByFBV = new Map<string, number>()
    for (const r of areaRows) {
        const key = fbvKeyFromNames(r.finca, r.bloque, r.variedad)
        const total = toNumber(r.area_total_m2)
        const prod = toNumber(r.area_productiva_m2)
        if (!areaTotalByFBV.has(key)) areaTotalByFBV.set(key, 0)
        areaTotalByFBV.set(key, Math.max(areaTotalByFBV.get(key) ?? 0, total))
        areaProdByFBV.set(key, Math.max(areaProdByFBV.get(key) ?? 0, prod))
    }
    return { areaTotalByFBV, areaProdByFBV }
}

// Sorters
export function cmpFechaDescThenFBV(a: any, b: any): number {
    const fa = String(a.fecha ?? '')
    const fb = String(b.fecha ?? '')
    const cmp = fb.localeCompare(fa)
    if (cmp !== 0) return cmp
    const keys: Array<'finca' | 'bloque' | 'variedad'> = ['finca', 'bloque', 'variedad']
    for (const k of keys) {
        const va = String(a[k] ?? '')
        const vb = String(b[k] ?? '')
        const c = va.localeCompare(vb)
        if (c !== 0) return c
    }
    return 0
}
export function cmpFechaDescThenFBVThenCamaSeccion(a: any, b: any): number {
    const first = cmpFechaDescThenFBV(a, b)
    if (first !== 0) return first
    const keys: Array<'cama' | 'seccion'> = ['cama', 'seccion']
    for (const k of keys) {
        const va = String(a[k] ?? '')
        const vb = String(b[k] ?? '')
        const c = va.localeCompare(vb)
        if (c !== 0) return c
    }
    return 0
}
