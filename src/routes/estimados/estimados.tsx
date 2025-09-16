import { createFileRoute } from '@tanstack/react-router'
import * as React from 'react'
import { useDeferredLiveQuery } from '@/hooks/use-deferred-live-query'
import { getStore } from '@/lib/dexie'
import { DataTable } from '@/components/data-table'
import { DataTableSkeleton } from '@/components/data-table-skeleton'
import { formatDate } from '@/lib/utils'
import { supabase } from '@/lib/supabase'

export const Route = createFileRoute('/estimados/estimados' as any)({
  component: Page,
})

type Row = {
  finca: string
  bloque: string
  variedad: string
  cama: string
  id_cama: string | number
  tipo_observacion: string
  fecha?: string | null
  cantidad_total: number
  area_observada: number
  area_cama: number
  area_productiva: number
  densidad: number
  estimado_cama: number
  estimado_bloque: number
  densidad_b: number
  estimado_bloque_b: number
}

function Page() {
  const { data, loading } = useDeferredLiveQuery<Row[] | undefined>(async () => {
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

    const [observaciones, camas, grupos, bloques, fincas, variedades] = await Promise.all([
      getStore('observacion').toArray(),
      getStore('cama').toArray(),
      getStore('grupo_cama').toArray(),
      getStore('bloque').toArray(),
      getStore('finca').toArray(),
      getStore('variedad').toArray(),
    ])

    // seccion.largo_m (single row used for all camas)
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

    const camasById = mapBy(camas as any[], 'id_cama')
    const gruposById = mapBy(grupos as any[], 'id_grupo')
    const bloquesById = mapBy(bloques as any[], 'id_bloque')
    const fincasById = mapBy(fincas as any[], 'id_finca')
    const variedadesById = mapBy(variedades as any[], 'id_variedad')

    // Precompute area productiva per (bloque,variedad) across productivo grupos
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

    // Group by (id_cama, tipo_observacion)
    const acc = new Map<string, Row>()
    for (const o of (observaciones as any[])) {
      const idCama = String(o?.id_cama ?? '')
      if (!idCama) continue
      const cama = camasById.get(idCama)
      if (!cama) continue
      const ancho = Number((cama as any)?.ancho_metros) || 0
      const largo = Number((cama as any)?.largo_metros) || 0
      const areaCama = largo * ancho
      const areaObs = (Number(seccionLargoM) || 0) * ancho
      const cant = parseNumber((o as any)?.cantidad)
      const g = gruposById.get(String((cama as any)?.id_grupo))
      const b = g ? bloquesById.get(String((g as any)?.id_bloque)) : undefined
      const f = b ? fincasById.get(String((b as any)?.id_finca)) : undefined
      const v = g ? variedadesById.get(String((g as any)?.id_variedad)) : undefined
      const tipo = String(o?.tipo_observacion ?? '')
      const key = `${idCama}|${tipo}`
      const gKey = g ? `${String((g as any).id_bloque)}|${String((g as any).id_variedad)}` : 'x|x'
      const areaProductiva = g ? (areaByBloqueVar.get(gKey) || 0) : 0
      const existing = acc.get(key)
      if (existing) {
        existing.cantidad_total += cant
        existing.area_observada += areaObs
        // Keep latest date
        const prev = existing.fecha ? new Date(existing.fecha) : null
        const curRaw: any = (o as any)?.creado_en ?? (o as any)?.fecha ?? null
        const cur = curRaw ? new Date(curRaw) : null
        if (cur && (!prev || cur > prev)) existing.fecha = cur.toISOString()
      } else {
        acc.set(key, {
          id_cama: (cama as any)?.id_cama,
          cama: String((cama as any)?.nombre ?? ''),
          bloque: String((b as any)?.nombre ?? ''),
          finca: String((f as any)?.nombre ?? ''),
          variedad: String((v as any)?.nombre ?? ''),
          tipo_observacion: tipo,
          fecha: (() => {
            const raw: any = (o as any)?.creado_en ?? (o as any)?.fecha ?? null
            if (!raw) return null
            const d = new Date(raw)
            return isNaN(d.getTime()) ? String(raw) : d.toISOString()
          })(),
          cantidad_total: cant,
          area_observada: areaObs,
          area_cama: areaCama,
          area_productiva: areaProductiva,
          densidad: 0,
          estimado_cama: 0,
          estimado_bloque: 0,
          densidad_b: 0,
          estimado_bloque_b: 0,
        })
      }
    }

    // finalize derived fields
    const rows = Array.from(acc.values()).map((r) => {
      const densidad = r.area_observada > 0 ? r.cantidad_total / r.area_observada : 0
      const estimado_cama = densidad * r.area_cama
      const estimado_bloque = densidad * r.area_productiva
      const densidad_b = r.area_cama > 0 ? r.cantidad_total / r.area_cama : 0
      const estimado_bloque_b = densidad_b * r.area_productiva
      return { ...r, densidad, estimado_cama, estimado_bloque, densidad_b, estimado_bloque_b }
    }).sort((a, b) =>
      a.finca.localeCompare(b.finca, undefined, { sensitivity: 'base' }) ||
      a.bloque.localeCompare(b.bloque, undefined, { sensitivity: 'base' }) ||
      a.variedad.localeCompare(b.variedad, undefined, { sensitivity: 'base' }) ||
      a.cama.localeCompare(b.cama, undefined, { sensitivity: 'base' }) ||
      a.tipo_observacion.localeCompare(b.tipo_observacion, undefined, { sensitivity: 'base' })
    )

    return rows as Row[]
  }, [], { defer: false })

  const fmt = (v: number) => (Number(v || 0)).toLocaleString(undefined, { maximumFractionDigits: 2 })
  const columns = React.useMemo(() => ([
    { key: 'finca', header: 'Finca' },
    { key: 'bloque', header: 'Bloque' },
    { key: 'variedad', header: 'Variedad' },
    { key: 'cama', header: 'Cama' },
    { key: 'tipo_observacion', header: 'Estado fenológico' },
    { key: 'fecha', header: 'Fecha', render: (v: any) => formatDate(v) },
    { key: 'cantidad_total', header: 'Cantidad' },
    { key: 'area_observada', header: 'Área observada (m²)', render: (v: number) => fmt(v) },
    { key: 'area_cama', header: 'Área cama (m²)', render: (v: number) => fmt(v) },
    { key: 'area_productiva', header: 'Área productiva (m²)', render: (v: number) => fmt(v) },
    { key: 'densidad', header: 'Densidad (/m²)', render: (v: number) => fmt(v) },
    { key: 'estimado_cama', header: 'Estimado cama (a)', render: (v: number) => fmt(v) },
    { key: 'estimado_bloque', header: 'Estimado bloque (a)', render: (v: number) => fmt(v) },
    { key: 'densidad_b', header: 'Densidad B (/m²)', render: (v: number) => fmt(v) },
    { key: 'estimado_bloque_b', header: 'Estimado bloque (b)', render: (v: number) => fmt(v) },
  ]), []) as any

  return (
    <div className="h-full min-h-0 min-w-0 flex flex-col overflow-hidden">
      {loading && <DataTableSkeleton columns={columns as any} rows={8} />}
      {!loading && (
        <DataTable<Row> caption={`${(data || []).length}`} columns={columns} rows={data || []} />
      )}
    </div>
  )
}
