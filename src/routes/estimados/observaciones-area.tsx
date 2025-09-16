import { createFileRoute } from '@tanstack/react-router'
import * as React from 'react'
import { useDeferredLiveQuery } from '@/hooks/use-deferred-live-query'
import { getStore } from '@/lib/dexie'
import { DataTable } from '@/components/data-table'
import { DataTableSkeleton } from '@/components/data-table-skeleton'
import { formatDate } from '@/lib/utils'
import { getTableConfig } from '@/services/db'
import { useDottedLookups } from '@/hooks/use-dotted-lookups'
import { supabase } from '@/lib/supabase'

export const Route = createFileRoute('/estimados/observaciones-area')({
  component: Page,
})

const ESTADO_PRODUCTIVO = 'productivo'

function Page() {
  // Load base data
  const { data, loading } = useDeferredLiveQuery<any[] | undefined>(async () => {
    const [observaciones, camas, grupos] = await Promise.all([
      getStore('observacion').toArray(),
      getStore('cama').toArray(),
      getStore('grupo_cama').toArray(),
    ])

    // Try to read seccion length locally; fallback to Supabase if not available
    let seccionLargoM = 0
    try {
      const secciones = await getStore('seccion').toArray()
      if (secciones && secciones.length > 0) {
        const s0: any = (secciones as any[])[0]
        seccionLargoM = Number(s0?.largo_m) || 0
      }
    } catch {
      const { data: secData } = await supabase.from('seccion').select('largo_m').limit(1)
      if (secData && secData.length > 0) {
        const s0: any = (secData as any[])[0]
        seccionLargoM = Number(s0?.largo_m) || 0
      }
    }

    const mapBy = <T extends Record<string, any>>(arr: T[], key: string) => {
      const m = new Map<string, T>()
      for (const it of arr) m.set(String(it[key]), it)
      return m
    }

    const gruposById = mapBy(grupos as any[], 'id_grupo')
    const camasById = mapBy(camas as any[], 'id_cama')

    // Precompute area per (bloque,variedad) across productivo grupos
    const areaByBloqueVar = new Map<string, number>()
    for (const c of camas as any[]) {
      const g = gruposById.get(String(c.id_grupo))
      if (!g) continue
      if ((g.estado ?? '').toString().toLowerCase() !== ESTADO_PRODUCTIVO) continue
      const key = `${String(g.id_bloque)}|${String(g.id_variedad)}`
      const largo = Number(c.largo_metros) || 0
      const ancho = Number(c.ancho_metros) || 0
      const area = largo * ancho
      areaByBloqueVar.set(key, (areaByBloqueVar.get(key) || 0) + area)
    }

    // Augment each observación with area_productiva for its bloque/variedad
    // and area_cama computed from the linked cama (largo_metros * ancho_metros)
    const augmented = (observaciones as any[]).map((o) => {
      const cama = o?.id_cama != null ? camasById.get(String(o.id_cama)) : undefined
      const g = cama ? gruposById.get(String(cama.id_grupo)) : undefined
      const key = g ? `${String(g.id_bloque)}|${String(g.id_variedad)}` : 'x|x'
      const area_productiva = g ? (areaByBloqueVar.get(key) || 0) : 0
      const largo = Number((cama as any)?.largo_metros) || 0
      const ancho = Number((cama as any)?.ancho_metros) || 0
      const area_cama = largo * ancho
      const area_observacion = (Number(seccionLargoM) || 0) * (Number((cama as any)?.ancho_metros) || 0)
      const fecha = (o as any)?.creado_en ?? (o as any)?.fecha ?? null
      return { ...o, fecha, area_productiva, area_cama, area_observacion }
    })

    return augmented as any[]
  }, [], { defer: false })

  const baseColumns = getTableConfig('observacion')?.columns ?? []
  const columns = React.useMemo(() => {
    const filtered = baseColumns.filter((c: any) => c.key !== 'creado_en' && c.key !== 'fecha')
    const fmtNum = (v: number) => (Number(v || 0)).toLocaleString(undefined, { maximumFractionDigits: 2 })
    const fmtFecha = (v: any) => formatDate(v)
    return [
      { key: 'fecha', header: 'Fecha', render: (v: any) => fmtFecha(v) },
      ...filtered,
      { key: 'area_observacion', header: 'Área observación (m²)', render: (v: number) => fmtNum(v) },
      { key: 'area_cama', header: 'Área cama (m²)', render: (v: number) => fmtNum(v) },
      { key: 'area_productiva', header: 'Área productiva (m²)', render: (v: number) => fmtNum(v) },
    ]
  }, [JSON.stringify(baseColumns)]) as any

  const { displayRows } = useDottedLookups('observacion', data ?? [], columns)

  return (
    <div className="h-full min-h-0 min-w-0 flex flex-col overflow-hidden">
      {loading ? (
        <DataTableSkeleton columns={columns as any} rows={8} />
      ) : (
        <DataTable caption={`${displayRows.length}`} columns={columns} rows={displayRows} />
      )}
    </div>
  )
}

