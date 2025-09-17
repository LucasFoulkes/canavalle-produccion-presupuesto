import { createFileRoute } from '@tanstack/react-router'
import * as React from 'react'
import { useDeferredLiveQuery } from '@/hooks/use-deferred-live-query'
import { getStore, type AnyRow } from '@/lib/dexie'
import { DataTable, type Column } from '@/components/data-table'
import { DataTableSkeleton } from '@/components/data-table-skeleton'
import { supabase } from '@/lib/supabase'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { formatDate, formatDateRange } from '@/lib/utils'

export const Route = createFileRoute('/estimados/observaciones-resumen')({
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

type SourceEntry = AnyRow & { area_observada: number; cantidad: number }

function Page() {
    const { data, loading } = useDeferredLiveQuery<{ rows: Row[]; sources: Map<string, SourceEntry[]> } | undefined>(async () => {
        const parseNumber = (val: unknown): number => {
            if (typeof val === 'number') return Number.isFinite(val) ? val : 0
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

        let seccionLargoM = 0
        try {
            const secciones = await getStore('seccion').toArray()
            if (secciones.length > 0) {
                seccionLargoM = Number(secciones[0]?.['largo_m']) || 0
            }
        } catch {
            const { data: secData } = await supabase.from('seccion').select('largo_m').limit(1)
            if (Array.isArray(secData) && secData.length > 0) {
                seccionLargoM = Number((secData[0] as AnyRow)?.['largo_m']) || 0
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

        const acc = new Map<string, Row>()
        const sources = new Map<string, SourceEntry[]>()

        for (const obs of observaciones) {
            const idCama = obs?.['id_cama']
            if (idCama == null) continue
            const cama = camasById.get(String(idCama))
            if (!cama) continue
            const grupo = gruposById.get(String(cama?.['id_grupo']))
            if (!grupo) continue
            const bloque = bloquesById.get(String(grupo?.['id_bloque']))
            const finca = bloque ? fincasById.get(String(bloque?.['id_finca'])) : undefined
            const variedad = variedadesById.get(String(grupo?.['id_variedad']))
            const tipo = String(obs?.['tipo_observacion'] ?? '')

            const ancho = Number(cama?.['ancho_metros']) || 0
            const largo = Number(cama?.['largo_metros']) || 0
            const areaCama = largo * ancho
            const areaObs = (Number(seccionLargoM) || 0) * ancho
            const cantidad = parseNumber(obs?.['cantidad'])

            const key = `${String(idCama)}|${tipo}`
            const existing = acc.get(key)
            const rawDate = obs?.['creado_en'] ?? obs?.['fecha']
            const curDate = rawDate ? new Date(rawDate) : null

            if (existing) {
                existing.area_observada += areaObs
                existing.cantidad_total += cantidad
                if (curDate && !Number.isNaN(curDate.getTime())) {
                    const desde = existing.fecha_desde ? new Date(existing.fecha_desde) : null
                    const hasta = existing.fecha_hasta ? new Date(existing.fecha_hasta) : null
                    if (!desde || curDate < desde) existing.fecha_desde = curDate.toISOString()
                    if (!hasta || curDate > hasta) existing.fecha_hasta = curDate.toISOString()
                }
            } else {
                const gKey = `${String(grupo?.['id_bloque'])}|${String(grupo?.['id_variedad'])}`
                acc.set(key, {
                    id_cama: cama?.['id_cama'] as string | number,
                    cama: String(cama?.['nombre'] ?? ''),
                    bloque: String(bloque?.['nombre'] ?? ''),
                    finca: String(finca?.['nombre'] ?? ''),
                    variedad: String(variedad?.['nombre'] ?? ''),
                    tipo_observacion: tipo,
                    fecha_desde: curDate && !Number.isNaN(curDate.getTime()) ? curDate.toISOString() : null,
                    fecha_hasta: curDate && !Number.isNaN(curDate.getTime()) ? curDate.toISOString() : null,
                    area_observada: areaObs,
                    cantidad_total: cantidad,
                    area_cama: areaCama,
                    area_productiva: areaByBloqueVar.get(gKey) || 0,
                })
            }

            const list = sources.get(key) ?? []
            list.push({ ...obs, area_observada: areaObs, cantidad })
            sources.set(key, list)
        }

        const rows = Array.from(acc.values()).sort((a, b) =>
            a.finca.localeCompare(b.finca, undefined, { sensitivity: 'base' }) ||
            a.bloque.localeCompare(b.bloque, undefined, { sensitivity: 'base' }) ||
            a.variedad.localeCompare(b.variedad, undefined, { sensitivity: 'base' }) ||
            a.cama.localeCompare(b.cama, undefined, { sensitivity: 'base' }) ||
            a.tipo_observacion.localeCompare(b.tipo_observacion, undefined, { sensitivity: 'base' })
        )

        return { rows, sources }
    }, [], { defer: false })

    const rows = React.useMemo(() => data?.rows ?? [], [data])
    const sources = React.useMemo(() => data?.sources ?? new Map<string, SourceEntry[]>(), [data])

    const [open, setOpen] = React.useState(false)
    const [selectedKey, setSelectedKey] = React.useState<string | null>(null)
    const selectedRow = React.useMemo(
        () => rows.find((r) => `${r.id_cama}|${r.tipo_observacion}` === selectedKey) ?? null,
        [rows, selectedKey],
    )

    const fmt = (value: unknown) => (Number(value ?? 0)).toLocaleString(undefined, { maximumFractionDigits: 2 })
    const columns = React.useMemo<Column<Row>[]>(
        () => [
            { key: 'finca', header: 'Finca' },
            { key: 'bloque', header: 'Bloque' },
            { key: 'variedad', header: 'Variedad' },
            { key: 'cama', header: 'Cama' },
            { key: 'tipo_observacion', header: 'Estado fenológico' },
            { key: 'fecha_desde', header: 'Fecha', render: (_, row) => formatDateRange(row.fecha_desde, row.fecha_hasta) },
            { key: 'cantidad_total', header: 'Cantidad' },
            { key: 'area_observada', header: 'Área observada (m²)', render: (value) => fmt(value) },
            { key: 'area_cama', header: 'Área cama (m²)', render: (value) => fmt(value) },
            { key: 'area_productiva', header: 'Área productiva (m²)', render: (value) => fmt(value) },
        ],
        [],
    )

    const skeletonColumns = React.useMemo(() => columns.map((c) => ({ key: String(c.key), header: c.header })), [columns])

    return (
        <div className="h-full min-h-0 min-w-0 flex flex-col overflow-hidden">
            {loading ? (
                <DataTableSkeleton columns={skeletonColumns} rows={8} />
            ) : (
                <DataTable
                    caption={`${rows.length}`}
                    columns={columns}
                    rows={rows}
                    getRowKey={(r) => `${r.id_cama}|${r.tipo_observacion}`}
                    onRowClick={(r) => {
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
                                <span className="font-medium">Finca:</span> {selectedRow.finca}{' '}
                                <span className="font-medium">Bloque:</span> {selectedRow.bloque}{' '}
                                <span className="font-medium">Cama:</span> {selectedRow.cama}{' '}
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
                                                {list.map((o, idx) => (
                                                    <tr key={idx} className="border-b last:border-b-0">
                                                        <td className="py-1.5 px-2 whitespace-nowrap">{formatDate(o['creado_en'] ?? o['fecha'])}</td>
                                                        <td className="py-1.5 px-2 whitespace-nowrap">{String(o['tipo_observacion'] ?? '')}</td>
                                                        <td className="py-1.5 px-2 whitespace-nowrap">{Number(o['cantidad'] || 0).toLocaleString(undefined, { maximumFractionDigits: 2 })}</td>
                                                        <td className="py-1.5 px-2 whitespace-nowrap">{Number(o['area_observada'] || 0).toLocaleString(undefined, { maximumFractionDigits: 2 })}</td>
                                                        <td className="py-1.5 px-2">{String(o['notas'] ?? o['descripcion'] ?? '')}</td>
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
