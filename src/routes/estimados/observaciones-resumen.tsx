import { createFileRoute } from '@tanstack/react-router'
import * as React from 'react'
import { useDeferredLiveQuery } from '@/hooks/use-deferred-live-query'
import { getStore } from '@/lib/dexie'
import { DataTable } from '@/components/data-table'
import { DataTableSkeleton } from '@/components/data-table-skeleton'
import { supabase } from '@/lib/supabase'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { formatDate, formatDateRange } from '@/lib/utils'

export const Route = createFileRoute('/estimados/observaciones-resumen' as any)({
    component: Page,
})

type Row = {
    finca: string
    bloque: string
    variedad: string
    cama: string
    id_cama: string | number
    tipo_observacion: string
    fecha_desde?: string | null
    fecha_hasta?: string | null
    area_observada: number
    cantidad_total: number
    area_cama: number
    area_productiva: number
}

function Page() {
    const { data, loading } = useDeferredLiveQuery<{ rows: Row[]; sources: Map<string, any[]> } | undefined>(async () => {
        const parseNumber = (val: any): number => {
            if (typeof val === 'number') return isFinite(val) ? val : 0
            if (typeof val === 'string') {
                const s = val.trim()
                if (!s) return 0
                // Handle common locales: "1.234,56" -> 1234.56, "1,234.56" -> 1234.56
                // Heuristic: if there is a comma and either no dot or both separators exist, treat comma as decimal and dots as thousand sep.
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
        const sources = new Map<string, any[]>()
        for (const o of (observaciones as any[])) {
            const idCama = String(o?.id_cama ?? '')
            if (!idCama) continue
            const cama = camasById.get(idCama)
            if (!cama) continue
            const ancho = Number((cama as any)?.ancho_metros) || 0
            const areaObs = (Number(seccionLargoM) || 0) * ancho
            const cant = parseNumber((o as any)?.cantidad)
            const g = gruposById.get(String((cama as any)?.id_grupo))
            const b = g ? bloquesById.get(String((g as any)?.id_bloque)) : undefined
            const f = b ? fincasById.get(String((b as any)?.id_finca)) : undefined
            const v = g ? variedadesById.get(String((g as any)?.id_variedad)) : undefined
            const tipo = String(o?.tipo_observacion ?? '')
            const key = `${idCama}|${tipo}`
            const existing = acc.get(key)
            const rawDate: any = (o as any)?.creado_en ?? (o as any)?.fecha ?? null
            const curDate = rawDate ? new Date(rawDate) : null

            if (existing) {
                existing.area_observada += areaObs
                existing.cantidad_total += cant
                if (curDate && !isNaN(curDate.getTime())) {
                    const desde = existing.fecha_desde ? new Date(existing.fecha_desde) : null
                    const hasta = existing.fecha_hasta ? new Date(existing.fecha_hasta) : null
                    if (!desde || curDate < desde) existing.fecha_desde = curDate.toISOString()
                    if (!hasta || curDate > hasta) existing.fecha_hasta = curDate.toISOString()
                }
            } else {
                const gKey = g ? `${String((g as any).id_bloque)}|${String((g as any).id_variedad)}` : 'x|x'
                const largo = Number((cama as any)?.largo_metros) || 0
                const areaCama = largo * ancho
                acc.set(key, {
                    id_cama: (cama as any)?.id_cama,
                    cama: String((cama as any)?.nombre ?? ''),
                    bloque: String((b as any)?.nombre ?? ''),
                    finca: String((f as any)?.nombre ?? ''),
                    variedad: String((v as any)?.nombre ?? ''),
                    tipo_observacion: tipo,
                    fecha_desde: curDate && !isNaN(curDate.getTime()) ? curDate.toISOString() : null,
                    fecha_hasta: curDate && !isNaN(curDate.getTime()) ? curDate.toISOString() : null,
                    area_observada: areaObs,
                    cantidad_total: cant,
                    area_cama: areaCama,
                    area_productiva: g ? (areaByBloqueVar.get(gKey) || 0) : 0,
                })
            }

            const list = sources.get(key) || []
            list.push({ ...o, area_observada: areaObs, cantidad: cant })
            sources.set(key, list)
        }

        // Sort for stable display
        const rows = Array.from(acc.values()).sort((a, b) =>
            a.finca.localeCompare(b.finca, undefined, { sensitivity: 'base' }) ||
            a.bloque.localeCompare(b.bloque, undefined, { sensitivity: 'base' }) ||
            a.variedad.localeCompare(b.variedad, undefined, { sensitivity: 'base' }) ||
            a.cama.localeCompare(b.cama, undefined, { sensitivity: 'base' }) ||
            a.tipo_observacion.localeCompare(b.tipo_observacion, undefined, { sensitivity: 'base' })
        )

        return { rows, sources }
    }, [], { defer: false })

    const rows: Row[] = (data as any)?.rows ?? []
    const sources: Map<string, any[]> = (data as any)?.sources ?? new Map<string, any[]>()

    const [open, setOpen] = React.useState(false)
    const [selectedKey, setSelectedKey] = React.useState<string | null>(null)
    const selectedRow = React.useMemo(() => rows.find((r) => `${r.id_cama}|${r.tipo_observacion}` === selectedKey) ?? null, [rows, selectedKey])

    const fmt = (v: number) => (Number(v || 0)).toLocaleString(undefined, { maximumFractionDigits: 2 })
    const columns = React.useMemo(() => ([
        { key: 'finca', header: 'Finca' },
        { key: 'bloque', header: 'Bloque' },
        { key: 'variedad', header: 'Variedad' },
        { key: 'cama', header: 'Cama' },
        { key: 'tipo_observacion', header: 'Estado fenológico' },
        { key: 'fecha_desde', header: 'Fecha', render: (_: any, row: Row) => formatDateRange(row.fecha_desde, row.fecha_hasta) },
        { key: 'cantidad_total', header: 'Cantidad' },
        { key: 'area_observada', header: 'Área observada (m²)', render: (v: number) => fmt(v as any) },
        { key: 'area_cama', header: 'Área cama (m²)', render: (v: number) => fmt(v as any) },
        { key: 'area_productiva', header: 'Área productiva (m²)', render: (v: number) => fmt(v as any) },
    ]), []) as any

    return (
        <div className="h-full min-h-0 min-w-0 flex flex-col overflow-hidden">
            {loading ? (
                <DataTableSkeleton columns={columns as any} rows={8} />
            ) : (
                <DataTable
                    caption={`${rows?.length ?? 0}`}
                    columns={columns}
                    rows={rows ?? []}
                    getRowKey={(r: Row) => `${r.id_cama}|${r.tipo_observacion}`}
                    onRowClick={(r: Row) => {
                        setSelectedKey(`${r.id_cama}|${r.tipo_observacion}`)
                        setOpen(true)
                    }}
                />
            )}

            <Dialog open={open} onOpenChange={setOpen}>
                <DialogContent className="sm:max-w-3xl">
                    <DialogHeader>
                        <DialogTitle>Observaciones</DialogTitle>
                        {selectedRow ? (
                            <DialogDescription>
                                <span className="font-medium">Finca:</span> {selectedRow.finca} {' '}
                                <span className="font-medium">Bloque:</span> {selectedRow.bloque} {' '}
                                <span className="font-medium">Cama:</span> {selectedRow.cama} {' '}
                                <span className="font-medium">Estado fenológico:</span> {selectedRow.tipo_observacion}
                            </DialogDescription>
                        ) : null}
                    </DialogHeader>
                    {selectedKey ? (
                        <div className="space-y-3">
                            {(() => {
                                const list = sources.get(selectedKey) || []
                                if (!list.length) return <div className="text-sm text-muted-foreground">Sin observaciones para esta fila.</div>
                                return (
                                    <div className="max-h-[60vh] overflow-auto">
                                        <table className="w-full text-sm">
                                            <thead className="sticky top-0 bg-background">
                                                <tr className="border-b">
                                                    <th className="text-left py-2 px-2">Fecha</th>
                                                    <th className="text-left py-2 px-2">Estado fenológico</th>
                                                    <th className="text-left py-2 px-2">Cantidad</th>
                                                    <th className="text-left py-2 px-2">Área observada (m²)</th>
                                                    <th className="text-left py-2 px-2">Notas</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {list.map((o: any, idx: number) => (
                                                    <tr key={idx} className="border-b last:border-b-0">
                                                        <td className="py-1.5 px-2 whitespace-nowrap">{formatDate(o.creado_en ?? o.fecha)}</td>
                                                        <td className="py-1.5 px-2 whitespace-nowrap">{o.tipo_observacion ?? ''}</td>
                                                        <td className="py-1.5 px-2 whitespace-nowrap">{Number(o.cantidad || 0).toLocaleString(undefined, { maximumFractionDigits: 2 })}</td>
                                                        <td className="py-1.5 px-2 whitespace-nowrap">{Number(o.area_observada || 0).toLocaleString(undefined, { maximumFractionDigits: 2 })}</td>
                                                        <td className="py-1.5 px-2">{o.notas ?? o.descripcion ?? ''}</td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                )
                            })()}
                        </div>
                    ) : null}
                </DialogContent>
            </Dialog>
        </div>
    )
}
