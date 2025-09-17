import { createFileRoute } from '@tanstack/react-router'
import * as React from 'react'
import { useDeferredLiveQuery } from '@/hooks/use-deferred-live-query'
import { getStore, type AnyRow } from '@/lib/dexie'
import { DataTable } from '@/components/data-table'
import { DataTableSkeleton } from '@/components/data-table-skeleton'
import { formatDate } from '@/lib/utils'
import { getTableConfig } from '@/config/tables'
import { useDottedLookups } from '@/hooks/use-dotted-lookups'
import { supabase } from '@/lib/supabase'

export const Route = createFileRoute('/estimados/observaciones-area')({
  component: Page,
})

const ESTADO_PRODUCTIVO = 'productivo'

function Page() {
  // Load base data
  const { data, loading } = useDeferredLiveQuery<AnyRow[] | undefined>(async () => {
    const [observaciones, camas, grupos] = await Promise.all<[
      AnyRow[],
      AnyRow[],
      AnyRow[],
    ]>([
      getStore('observacion').toArray(),
      getStore('cama').toArray(),
      getStore('grupo_cama').toArray(),
    ])

    // Try to read seccion length locally; fallback to Supabase if not available
    let seccionLargoM = 0
    try {
      const secciones = await getStore('seccion').toArray()
      if (secciones.length > 0) {
        const s0 = secciones[0]
        seccionLargoM = Number(s0?.['largo_m']) || 0
      }
    } catch {
      const { data: secData } = await supabase.from('seccion').select('largo_m').limit(1)
      if (Array.isArray(secData) && secData.length > 0) {
        const s0 = secData[0] as AnyRow
        seccionLargoM = Number(s0?.['largo_m']) || 0
      }
    }

    const mapBy = <T extends Record<string, unknown>>(arr: T[], key: string) => {
      const m = new Map<string, T>()
      for (const it of arr) {
        const id = it?.[key]
        if (id == null) continue
        m.set(String(id), it)
      }
      return m
    }

    const gruposById = mapBy(grupos, 'id_grupo')
    const camasById = mapBy(camas, 'id_cama')

    // Precompute area per (bloque,variedad) across productivo grupos
    const areaByBloqueVar = new Map<string, number>()
    for (const cama of camas) {
      const g = gruposById.get(String(cama?.['id_grupo']))
      if (!g) continue
      const estado = String(g?.['estado'] ?? '').toLowerCase()
      if (estado !== ESTADO_PRODUCTIVO) continue
      const key = `${String(g?.['id_bloque'])}|${String(g?.['id_variedad'])}`
      const largo = Number(cama?.['largo_metros']) || 0
      const ancho = Number(cama?.['ancho_metros']) || 0
      const area = largo * ancho
      areaByBloqueVar.set(key, (areaByBloqueVar.get(key) || 0) + area)
    }

    // Augment each observación with area_productiva for its bloque/variedad
    // and area_cama computed from the linked cama (largo_metros * ancho_metros)
    const augmented = observaciones.map((o) => {
      const cama = o?.['id_cama'] != null ? camasById.get(String(o['id_cama'])) : undefined
      const g = cama ? gruposById.get(String(cama?.['id_grupo'])) : undefined
      const key = g ? `${String(g?.['id_bloque'])}|${String(g?.['id_variedad'])}` : 'x|x'
      const area_productiva = g ? (areaByBloqueVar.get(key) || 0) : 0
      const largo = Number(cama?.['largo_metros']) || 0
      const ancho = Number(cama?.['ancho_metros']) || 0
      const area_cama = largo * ancho
      const area_observacion = (Number(seccionLargoM) || 0) * (Number(cama?.['ancho_metros']) || 0)
      const fecha = (o?.['creado_en'] ?? o?.['fecha']) ?? null
      return {
        ...o,
        fecha,
        area_productiva,
        area_cama,
        area_observacion,
      } as AnyRow
    })

    return augmented
  }, [], { defer: false })

  const baseColumns = getTableConfig('observacion')?.columns
  const columns = React.useMemo<Column<AnyRow>[]>(() => {
    const columnDefs = (baseColumns ?? []).filter((c) => c.key !== 'creado_en' && c.key !== 'fecha')
    const fmtNum = (value: unknown) => (Number(value ?? 0)).toLocaleString(undefined, { maximumFractionDigits: 2 })
    const fmtFecha = (value: unknown) => formatDate(value)
    const derived: Column<AnyRow>[] = columnDefs.map((c) => ({
      key: c.key as keyof AnyRow,
      header: c.header,
    }))
    return [
      { key: 'fecha', header: 'Fecha', render: (value) => fmtFecha(value) },
      ...derived,
      { key: 'area_observacion', header: 'Área observación (m²)', render: (value) => fmtNum(value) },
      { key: 'area_cama', header: 'Área cama (m²)', render: (value) => fmtNum(value) },
      { key: 'area_productiva', header: 'Área productiva (m²)', render: (value) => fmtNum(value) },
    ]
  }, [baseColumns])

  const { displayRows } = useDottedLookups('observacion', data ?? [], columns)
  const skeletonColumns = React.useMemo(() => columns.map((c) => ({ key: String(c.key), header: c.header })), [columns])

  return (
    <div className="h-full min-h-0 min-w-0 flex flex-col overflow-hidden">
      {loading ? (
        <DataTableSkeleton columns={skeletonColumns} rows={8} />
      ) : (
        <DataTable caption={`${displayRows.length}`} columns={columns} rows={displayRows} />
      )}
    </div>
  )
}

