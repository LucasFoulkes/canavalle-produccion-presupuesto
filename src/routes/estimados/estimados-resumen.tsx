import { createFileRoute } from '@tanstack/react-router'
import * as React from 'react'
import { useDeferredLiveQuery } from '@/hooks/use-deferred-live-query'
import { getStore } from '@/lib/dexie'
import { DataTable } from '@/components/data-table'
import { DataTableSkeleton } from '@/components/data-table-skeleton'
import { formatDate } from '@/lib/utils'

export const Route = createFileRoute('/estimados/estimados-resumen' as any)({
  component: Page,
})

type Row = {
  finca: string
  bloque: string
  variedad: string
  fecha?: string | null
  dias_brotacion: number
  dias_cincuenta_mm: number
  dias_quince_cm: number
  dias_veinte_cm: number
  dias_primera_hoja: number
  dias_espiga: number
  dias_arroz: number
  dias_arveja: number
  dias_garbanzo: number
  dias_uva: number
  dias_rayando_color: number
  dias_sepalos_abiertos: number
  dias_cosecha: number
}

const STAGE_KEYS = [
  'dias_brotacion',
  'dias_cincuenta_mm',
  'dias_quince_cm',
  'dias_veinte_cm',
  'dias_primera_hoja',
  'dias_espiga',
  'dias_arroz',
  'dias_arveja',
  'dias_garbanzo',
  'dias_uva',
  'dias_rayando_color',
  'dias_sepalos_abiertos',
  'dias_cosecha',
] as const

function Page() {
  const { data: rows, loading } = useDeferredLiveQuery<Row[] | undefined>(async () => {
    // --- Normalization & mapping helpers ---
    const normalize = (s: any) =>
      String(s ?? '')
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '') // strip diacritics
        .replace(/\s+/g, '_')
        .replace(/[^a-z0-9_]/g, '')

    const mapTipoToStageKey = (tipo: any): typeof STAGE_KEYS[number] | null => {
      const t = normalize(tipo)
      const direct = t.startsWith('dias_') ? t : `dias_${t}`
      if ((STAGE_KEYS as readonly string[]).includes(direct)) return direct as any
      const syn: Record<string, typeof STAGE_KEYS[number]> = {
        brotacion: 'dias_brotacion',
        '50mm': 'dias_cincuenta_mm',
        '50_mm': 'dias_cincuenta_mm',
        cincuentamm: 'dias_cincuenta_mm',
        cincuenta_mm: 'dias_cincuenta_mm',
        quincecm: 'dias_quince_cm',
        '15cm': 'dias_quince_cm',
        '15_cm': 'dias_quince_cm',
        quince_cm: 'dias_quince_cm',
        veintecm: 'dias_veinte_cm',
        '20cm': 'dias_veinte_cm',
        '20_cm': 'dias_veinte_cm',
        veinte_cm: 'dias_veinte_cm',
        primerahoja: 'dias_primera_hoja',
        primera_hoja: 'dias_primera_hoja',
        espiga: 'dias_espiga',
        arroz: 'dias_arroz',
        arveja: 'dias_arveja',
        garbanzo: 'dias_garbanzo',
        uva: 'dias_uva',
        rayandocolor: 'dias_rayando_color',
        rayando_color: 'dias_rayando_color',
        sepalosabiertos: 'dias_sepalos_abiertos',
        sepalos_abiertos: 'dias_sepalos_abiertos',
        cosecha: 'dias_cosecha',
      }
      return syn[t] ?? null
    }

    const parseNumber = (val: any): number => {
      if (typeof val === 'number') return isFinite(val) ? val : 0
      if (typeof val === 'string') {
        const s = val.trim()
        if (!s) return 0
        const hasComma = s.includes(',')
        const hasDot = s.includes('.')
        let normalized = s
        if (hasComma && (!hasDot || (hasDot && hasComma))) {
          normalized = s.replace(/\./g, '').replace(/,/g, '.')
        }
        const n = Number(normalized)
        return isNaN(n) ? 0 : n
      }
      return 0
    }

    // --- Load required tables from Dexie (already synced from Supabase) ---
    const [observaciones, camas, grupos, bloques, fincas, variedades] = await Promise.all([
      getStore('observacion').toArray(),
      getStore('cama').toArray(),
      getStore('grupo_cama').toArray(),
      getStore('bloque').toArray(),
      getStore('finca').toArray(),
      getStore('variedad').toArray(),
    ])

    const mapBy = <T extends Record<string, any>>(arr: T[], key: string) => {
      const m = new Map<string, T>()
      for (const it of arr) m.set(String(it[key]), it)
      return m
    }

    const camasById = mapBy(camas as any[], 'id_cama')
    const gruposById = mapBy(grupos as any[], 'id_grupo')
    const bloquesById = mapBy(bloques as any[], 'id_bloque')
    const fincasById = mapBy(fincas as any[], 'id_finca')
    const variedadesById = mapBy(variedades as any[], 'id_variedad')

    // --- Pre-compute area productiva per (bloque,variedad) across groups with estado 'productivo' ---
    const ESTADO_PRODUCTIVO = 'productivo'
    const areaByBloqueVar = new Map<string, number>()
    for (const c of camas as any[]) {
      const g = gruposById.get(String((c as any).id_grupo))
      if (!g) continue
      const estado = String((g as any).estado ?? '').toLowerCase()
      if (estado !== ESTADO_PRODUCTIVO) continue
      const key = `${String((g as any).id_bloque)}|${String((g as any).id_variedad)}`
      const largo = Number((c as any).largo_metros) || 0
      const ancho = Number((c as any).ancho_metros) || 0
      const area = largo * ancho
      areaByBloqueVar.set(key, (areaByBloqueVar.get(key) || 0) + area)
    }

    // --- First aggregation level: per (bloque,variedad,fecha,stage,id_cama) ---
    type Leaf = { count: number; areaCama: number; bloqueId: string; variedadId: string; fincaId: string; dateKey: string; stageKey: typeof STAGE_KEYS[number] }
    const leafAcc = new Map<string, Leaf>()

    // Track dates per (bloque,variedad) even if no valid stage mapping so we can output a zero row
    const dateTouched = new Map<string, Set<string>>() // key: bloqueId|variedadId -> Set<dateKey>

    for (const o of (observaciones as any[])) {
      const idCama = String(o?.id_cama ?? '')
      if (!idCama) continue
      const cama = camasById.get(idCama)
      if (!cama) continue
      const g = gruposById.get(String((cama as any)?.id_grupo))
      if (!g) continue
      const bloqueId = String((g as any).id_bloque)
      const variedadId = String((g as any).id_variedad)
      const b = bloquesById.get(bloqueId)
      const f = b ? fincasById.get(String((b as any).id_finca)) : undefined
      const fincaId = f ? String((f as any).id_finca) : ''

      const rawDate: any = (o as any)?.creado_en ?? (o as any)?.fecha ?? null
      let dateKey = ''
      if (rawDate) {
        const d = new Date(rawDate)
        if (!isNaN(d.getTime())) dateKey = d.toISOString().slice(0, 10)
      }
      if (!dateKey) continue // still skip undated rows

      // record date presence
      const dvKey = `${bloqueId}|${variedadId}`
      if (!dateTouched.has(dvKey)) dateTouched.set(dvKey, new Set())
      dateTouched.get(dvKey)!.add(dateKey)

      const stageKey = mapTipoToStageKey(o?.tipo_observacion)
      if (!stageKey) continue // we only aggregate known stages, but keep date via dateTouched

      // cama area (full)
      const largo = Number((cama as any)?.largo_metros) || 0
      const ancho = Number((cama as any)?.ancho_metros) || 0
      const areaCama = largo * ancho
      if (areaCama <= 0) continue

      const cant = parseNumber((o as any)?.cantidad)
      if (cant <= 0) continue

      const leafKey = `${bloqueId}|${variedadId}|${dateKey}|${stageKey}|${idCama}`
      const existing = leafAcc.get(leafKey)
      if (existing) {
        existing.count += cant
      } else {
        leafAcc.set(leafKey, { count: cant, areaCama, bloqueId, variedadId, fincaId, dateKey, stageKey })
      }
    }

    // --- Second aggregation level: per (bloque,variedad,fecha) row, summing stage results ---
    const rowAcc = new Map<string, Row>()
    // Helper to fetch display names lazily
    const getNames = (bloqueId: string, variedadId: string) => {
      const b = bloquesById.get(bloqueId)
      const f = b ? fincasById.get(String((b as any).id_finca)) : undefined
      const v = variedadesById.get(variedadId)
      return {
        finca: String((f as any)?.nombre ?? ''),
        bloque: String((b as any)?.nombre ?? ''),
        variedad: String((v as any)?.nombre ?? ''),
      }
    }

    // Group leaves by (bloque,variedad,fecha,stage) to compute densities (sum counts / sum areas)
    interface StageGroup { totalCount: number; totalArea: number; bloqueId: string; variedadId: string; dateKey: string; stageKey: typeof STAGE_KEYS[number] }
    const stageGroupAcc = new Map<string, StageGroup>()
    for (const leaf of leafAcc.values()) {
      const sgKey = `${leaf.bloqueId}|${leaf.variedadId}|${leaf.dateKey}|${leaf.stageKey}`
      const sg = stageGroupAcc.get(sgKey)
      if (sg) {
        sg.totalCount += leaf.count
        sg.totalArea += leaf.areaCama
      } else {
        stageGroupAcc.set(sgKey, {
          totalCount: leaf.count,
          totalArea: leaf.areaCama,
          bloqueId: leaf.bloqueId,
          variedadId: leaf.variedadId,
          dateKey: leaf.dateKey,
          stageKey: leaf.stageKey,
        })
      }
    }

    for (const sg of stageGroupAcc.values()) {
      if (sg.totalArea <= 0) continue
      const densidad_b = sg.totalCount / sg.totalArea
      const areaProductiva = areaByBloqueVar.get(`${sg.bloqueId}|${sg.variedadId}`) || 0
      if (areaProductiva <= 0) {
        // keep a row even if productiva = 0 (shows date exists) but skip adding stage value
        const rowKeyZero = `${sg.bloqueId}|${sg.variedadId}|${sg.dateKey}`
        if (!rowAcc.has(rowKeyZero)) {
          const names = getNames(sg.bloqueId, sg.variedadId)
          rowAcc.set(rowKeyZero, {
            finca: names.finca,
            bloque: names.bloque,
            variedad: names.variedad,
            fecha: sg.dateKey,
            dias_brotacion: 0,
            dias_cincuenta_mm: 0,
            dias_quince_cm: 0,
            dias_veinte_cm: 0,
            dias_primera_hoja: 0,
            dias_espiga: 0,
            dias_arroz: 0,
            dias_arveja: 0,
            dias_garbanzo: 0,
            dias_uva: 0,
            dias_rayando_color: 0,
            dias_sepalos_abiertos: 0,
            dias_cosecha: 0,
          })
        }
        continue
      }
      const estimado_bloque_b = densidad_b * areaProductiva

      const rowKey = `${sg.bloqueId}|${sg.variedadId}|${sg.dateKey}`
      let row = rowAcc.get(rowKey)
      if (!row) {
        const names = getNames(sg.bloqueId, sg.variedadId)
        row = {
          finca: names.finca,
          bloque: names.bloque,
          variedad: names.variedad,
          fecha: sg.dateKey,
          dias_brotacion: 0,
          dias_cincuenta_mm: 0,
          dias_quince_cm: 0,
          dias_veinte_cm: 0,
          dias_primera_hoja: 0,
          dias_espiga: 0,
          dias_arroz: 0,
          dias_arveja: 0,
          dias_garbanzo: 0,
          dias_uva: 0,
          dias_rayando_color: 0,
          dias_sepalos_abiertos: 0,
          dias_cosecha: 0,
        }
        rowAcc.set(rowKey, row)
      }
      ; (row as any)[sg.stageKey] += estimado_bloque_b
    }

    // Ensure every date touched (even with no recognized stage groups) has a zero row
    for (const [bv, dates] of dateTouched.entries()) {
      const [bloqueId, variedadId] = bv.split('|')
      for (const d of dates) {
        const rowKey = `${bloqueId}|${variedadId}|${d}`
        if (!rowAcc.has(rowKey)) {
          const names = getNames(bloqueId, variedadId)
          rowAcc.set(rowKey, {
            finca: names.finca,
            bloque: names.bloque,
            variedad: names.variedad,
            fecha: d,
            dias_brotacion: 0,
            dias_cincuenta_mm: 0,
            dias_quince_cm: 0,
            dias_veinte_cm: 0,
            dias_primera_hoja: 0,
            dias_espiga: 0,
            dias_arroz: 0,
            dias_arveja: 0,
            dias_garbanzo: 0,
            dias_uva: 0,
            dias_rayando_color: 0,
            dias_sepalos_abiertos: 0,
            dias_cosecha: 0,
          })
        }
      }
    }

    // Sort rows consistently
    return Array.from(rowAcc.values()).sort((a, b) =>
      a.finca.localeCompare(b.finca, undefined, { sensitivity: 'base' }) ||
      a.bloque.localeCompare(b.bloque, undefined, { sensitivity: 'base' }) ||
      a.variedad.localeCompare(b.variedad, undefined, { sensitivity: 'base' }) ||
      (a.fecha || '').localeCompare(b.fecha || '')
    )
  }, [], { defer: false })

  const fmt = (v: number) => (Number(v || 0)).toLocaleString(undefined, { maximumFractionDigits: 2 })
  const columns = React.useMemo(() => ([
    { key: 'finca', header: 'Finca' },
    { key: 'bloque', header: 'Bloque' },
    { key: 'variedad', header: 'Variedad' },
    { key: 'fecha', header: 'Fecha', render: (v: any) => formatDate(v) },
    { key: 'dias_brotacion', header: 'Brotación', render: fmt },
    { key: 'dias_cincuenta_mm', header: '50 mm', render: fmt },
    { key: 'dias_quince_cm', header: '15 cm', render: fmt },
    { key: 'dias_veinte_cm', header: '20 cm', render: fmt },
    { key: 'dias_primera_hoja', header: 'Primera hoja', render: fmt },
    { key: 'dias_espiga', header: 'Espiga', render: fmt },
    { key: 'dias_arroz', header: 'Arroz', render: fmt },
    { key: 'dias_arveja', header: 'Arveja', render: fmt },
    { key: 'dias_garbanzo', header: 'Garbanzo', render: fmt },
    { key: 'dias_uva', header: 'Uva', render: fmt },
    { key: 'dias_rayando_color', header: 'Rayando color', render: fmt },
    { key: 'dias_sepalos_abiertos', header: 'Sépalos abiertos', render: fmt },
    { key: 'dias_cosecha', header: 'Cosecha', render: fmt },
  ]), []) as any

  return (
    <div className="h-full min-h-0 min-w-0 flex flex-col overflow-hidden">
      {loading ? (
        <DataTableSkeleton columns={columns as any} rows={8} />
      ) : (
        <DataTable caption={`${rows?.length ?? 0}`} columns={columns} rows={rows ?? []} />
      )}
    </div>
  )
}
//
