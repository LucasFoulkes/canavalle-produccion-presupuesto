import { createFileRoute } from '@tanstack/react-router'
import * as React from 'react'
import { useDeferredLiveQuery } from '@/hooks/use-deferred-live-query'
import { getStore, type AnyRow } from '@/lib/dexie'
import { DataTable, type Column } from '@/components/data-table'
import { DataTableSkeleton } from '@/components/data-table-skeleton'
import { formatDate } from '@/lib/utils'

export const Route = createFileRoute('/estimados/estimados-resumen')({
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

type StageKey = (typeof STAGE_KEYS)[number]

function Page() {
  const { data: rows, loading } = useDeferredLiveQuery<Row[] | undefined>(async () => {
    const normalize = (value: unknown) =>
      String(value ?? '')
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/\s+/g, '_')
        .replace(/[^a-z0-9_]/g, '')

    const mapTipoToStageKey = (tipo: unknown): StageKey | null => {
      const normalized = normalize(tipo)
      const direct = normalized.startsWith('dias_') ? normalized : `dias_${normalized}`
      if ((STAGE_KEYS as readonly string[]).includes(direct)) return direct as StageKey
      const syn: Record<string, StageKey> = {
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
      return syn[normalized] ?? null
    }

    const parseNumber = (val: unknown): number => {
      if (typeof val === 'number') return Number.isFinite(val) ? val : 0
      if (typeof val === 'string') {
        const trimmed = val.trim()
        if (!trimmed) return 0
        const hasComma = trimmed.includes(',')
        const hasDot = trimmed.includes('.')
        let normalized = trimmed
        if (hasComma && (!hasDot || (hasDot && hasComma))) {
          normalized = trimmed.replace(/\./g, '').replace(/,/g, '.')
        }
        const n = Number(normalized)
        return Number.isNaN(n) ? 0 : n
      }
      return 0
    }

    const [observaciones, camas, grupos, bloques, fincas, variedades] = await Promise.all<[
      AnyRow[],
      AnyRow[],
      AnyRow[],
      AnyRow[],
      AnyRow[],
      AnyRow[],
    ]>([
      getStore('observacion').toArray(),
      getStore('cama').toArray(),
      getStore('grupo_cama').toArray(),
      getStore('bloque').toArray(),
      getStore('finca').toArray(),
      getStore('variedad').toArray(),
    ])

    const mapBy = <T extends Record<string, unknown>>(arr: T[], key: string) => {
      const m = new Map<string, T>()
      for (const it of arr) {
        const id = it?.[key]
        if (id == null) continue
        m.set(String(id), it)
      }
      return m
    }

    const camasById = mapBy(camas, 'id_cama')
    const gruposById = mapBy(grupos, 'id_grupo')
    const bloquesById = mapBy(bloques, 'id_bloque')
    const fincasById = mapBy(fincas, 'id_finca')
    const variedadesById = mapBy(variedades, 'id_variedad')

    const ESTADO_PRODUCTIVO = 'productivo'
    const areaByBloqueVar = new Map<string, number>()
    for (const cama of camas) {
      const grupo = gruposById.get(String(cama?.['id_grupo']))
      if (!grupo) continue
      const estado = String(grupo?.['estado'] ?? '').toLowerCase()
      if (estado !== ESTADO_PRODUCTIVO) continue
      const key = `${String(grupo?.['id_bloque'])}|${String(grupo?.['id_variedad'])}`
      const largo = Number(cama?.['largo_metros']) || 0
      const ancho = Number(cama?.['ancho_metros']) || 0
      const area = largo * ancho
      areaByBloqueVar.set(key, (areaByBloqueVar.get(key) || 0) + area)
    }

    type Leaf = {
      count: number
      areaCama: number
      bloqueId: string
      variedadId: string
      dateKey: string
      stageKey: StageKey
    }

    const leafAcc = new Map<string, Leaf>()
    const dateTouched = new Map<string, Set<string>>()

    for (const obs of observaciones) {
      const idCama = obs?.['id_cama']
      if (idCama == null) continue
      const cama = camasById.get(String(idCama))
      if (!cama) continue
      const grupo = gruposById.get(String(cama?.['id_grupo']))
      if (!grupo) continue
      const bloqueId = String(grupo?.['id_bloque'])
      const variedadId = String(grupo?.['id_variedad'])

      const rawDate = obs?.['creado_en'] ?? obs?.['fecha']
      let dateKey = ''
      if (rawDate) {
        const d = new Date(rawDate)
        if (!Number.isNaN(d.getTime())) dateKey = d.toISOString().slice(0, 10)
      }
      if (!dateKey) continue

      const dvKey = `${bloqueId}|${variedadId}`
      if (!dateTouched.has(dvKey)) dateTouched.set(dvKey, new Set())
      dateTouched.get(dvKey)!.add(dateKey)

      const stageKey = mapTipoToStageKey(obs?.['tipo_observacion'])
      if (!stageKey) continue

      const largo = Number(cama?.['largo_metros']) || 0
      const ancho = Number(cama?.['ancho_metros']) || 0
      const areaCama = largo * ancho
      if (areaCama <= 0) continue

      const count = parseNumber(obs?.['cantidad'])
      if (count <= 0) continue

      const leafKey = `${bloqueId}|${variedadId}|${dateKey}|${stageKey}|${String(idCama)}`
      const existing = leafAcc.get(leafKey)
      if (existing) {
        existing.count += count
      } else {
        leafAcc.set(leafKey, { count, areaCama, bloqueId, variedadId, dateKey, stageKey })
      }
    }

    const rowAcc = new Map<string, Row>()
    const getNames = (bloqueId: string, variedadId: string) => {
      const bloque = bloquesById.get(bloqueId)
      const finca = bloque ? fincasById.get(String(bloque?.['id_finca'])) : undefined
      const variedad = variedadesById.get(variedadId)
      return {
        finca: String(finca?.['nombre'] ?? ''),
        bloque: String(bloque?.['nombre'] ?? ''),
        variedad: String(variedad?.['nombre'] ?? ''),
      }
    }

    interface StageGroup {
      totalCount: number
      totalArea: number
      bloqueId: string
      variedadId: string
      dateKey: string
      stageKey: StageKey
    }

    const stageGroupAcc = new Map<string, StageGroup>()
    for (const leaf of leafAcc.values()) {
      const sgKey = `${leaf.bloqueId}|${leaf.variedadId}|${leaf.dateKey}|${leaf.stageKey}`
      const existing = stageGroupAcc.get(sgKey)
      if (existing) {
        existing.totalCount += leaf.count
        existing.totalArea += leaf.areaCama
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

    const createEmptyRow = (names: { finca: string; bloque: string; variedad: string }, dateKey: string): Row => ({
      finca: names.finca,
      bloque: names.bloque,
      variedad: names.variedad,
      fecha: dateKey,
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

    for (const sg of stageGroupAcc.values()) {
      if (sg.totalArea <= 0) continue
      const densidadBloque = sg.totalCount / sg.totalArea
      const areaProductiva = areaByBloqueVar.get(`${sg.bloqueId}|${sg.variedadId}`) || 0
      const rowKey = `${sg.bloqueId}|${sg.variedadId}|${sg.dateKey}`
      if (areaProductiva <= 0) {
        if (!rowAcc.has(rowKey)) {
          const names = getNames(sg.bloqueId, sg.variedadId)
          rowAcc.set(rowKey, createEmptyRow(names, sg.dateKey))
        }
        continue
      }

      const estimado = densidadBloque * areaProductiva
      let row = rowAcc.get(rowKey)
      if (!row) {
        const names = getNames(sg.bloqueId, sg.variedadId)
        row = createEmptyRow(names, sg.dateKey)
        rowAcc.set(rowKey, row)
      }
      row[sg.stageKey] += estimado
    }

    for (const [bv, dates] of dateTouched.entries()) {
      const [bloqueId, variedadId] = bv.split('|')
      for (const dateKey of dates) {
        const rowKey = `${bloqueId}|${variedadId}|${dateKey}`
        if (!rowAcc.has(rowKey)) {
          const names = getNames(bloqueId, variedadId)
          rowAcc.set(rowKey, createEmptyRow(names, dateKey))
        }
      }
    }

    return Array.from(rowAcc.values()).sort(
      (a, b) =>
        a.finca.localeCompare(b.finca, undefined, { sensitivity: 'base' }) ||
        a.bloque.localeCompare(b.bloque, undefined, { sensitivity: 'base' }) ||
        a.variedad.localeCompare(b.variedad, undefined, { sensitivity: 'base' }) ||
        (a.fecha || '').localeCompare(b.fecha || '')
    )
  }, [], { defer: false })

  const fmt = (value: unknown) => (Number(value ?? 0)).toLocaleString(undefined, { maximumFractionDigits: 2 })
  const columns = React.useMemo<Column<Row>[]>(
    () => [
      { key: 'finca', header: 'Finca' },
      { key: 'bloque', header: 'Bloque' },
      { key: 'variedad', header: 'Variedad' },
      { key: 'fecha', header: 'Fecha', render: (value) => formatDate(value) },
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
    ],
    [],
  )

  const skeletonColumns = React.useMemo(() => columns.map((c) => ({ key: String(c.key), header: c.header })), [columns])

  return (
    <div className="h-full min-h-0 min-w-0 flex flex-col overflow-hidden">
      {loading ? (
        <DataTableSkeleton columns={skeletonColumns} rows={8} />
      ) : (
        <DataTable caption={`${rows?.length ?? 0}`} columns={columns} rows={rows ?? []} />
      )}
    </div>
  )
}
