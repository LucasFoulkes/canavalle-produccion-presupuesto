import { createFileRoute } from '@tanstack/react-router'
import DataTable from '@/components/data-table'
import { useEffect, useMemo, useState } from 'react'
import { fetchFincas, fetchTable } from '@/services/tables'

export const Route = createFileRoute('/$table')({
    validateSearch: (search: { columns?: string }) => search,
    component: TableRoute,
})

function TableRoute() {
    const params = Route.useParams()
    const tableName = params.table
    const [data, setData] = useState<Array<Record<string, unknown>>>([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const [fincaMap, setFincaMap] = useState<Record<number, string>>({})

    useEffect(() => {
        let isMounted = true
            ; (async () => {
                setLoading(true)
                try {
                    const rows = await fetchTable(tableName)
                    if (isMounted) setData(rows)
                } catch (err) {
                    console.error(err)
                    if (isMounted) setError(err instanceof Error ? err.message : 'Error cargando datos')
                } finally {
                    if (isMounted) setLoading(false)
                }
            })()
        return () => {
            isMounted = false
        }
    }, [tableName])

    // Build finca id => nombre map for rendering bloque.id_finca nicely
    useEffect(() => {
        let isMounted = true
            ; (async () => {
                try {
                    const fincas = await fetchFincas()
                    if (!isMounted) return
                    const map: Record<number, string> = {}
                    for (const f of fincas) {
                        if (typeof f.id_finca === 'number') {
                            map[f.id_finca] = f.nombre
                        }
                    }
                    setFincaMap(map)
                } catch {
                    // ignore, will fallback to showing id
                }
            })()
        return () => {
            isMounted = false
        }
    }, [])

    const format: Record<string, (v: unknown) => React.ReactNode> | undefined = useMemo(() => {
        if (tableName === 'bloque') {
            return {
                id_finca: (val: unknown): React.ReactNode => {
                    const id = typeof val === 'number' ? val : Number(val)
                    if (!Number.isNaN(id) && fincaMap[id] != null) return String(fincaMap[id])
                    if (val == null) return '—'
                    return String(val)
                },
            }
        }
        return undefined
    }, [tableName, fincaMap])

    return (
        <div>
            <DataTable
                data={data}
                loading={loading}
                error={error}
                caption={`${tableName} (${data.length})`}
                keyField={tableName === 'finca' ? 'id_finca' : tableName === 'bloque' ? 'id_bloque' : tableName === 'cama' ? 'id_cama' : undefined}
                columnLabels={tableName === 'finca' ? {
                    id_finca: 'ID',
                    nombre: 'Nombre',
                    creado_en: 'Creado',
                    eliminado_en: 'Eliminado',
                } : tableName === 'bloque' ? {
                    id_bloque: 'ID',
                    id_finca: 'Finca',
                    nombre: 'Nombre',
                    creado_en: 'Creado',
                    eliminado_en: 'Eliminado',
                    numero_camas: 'Nº Camas',
                    area_m2: 'Área (m²)',
                } : tableName === 'cama' ? {
                    id_cama: 'ID',
                    nombre: 'Nombre',
                    creado_en: 'Creado',
                    eliminado_en: 'Eliminado',
                    largo_metros: 'Largo (m)',
                    plantas_totales: 'Plantas Totales',
                    id_grupo: 'Grupo',
                    ancho_metros: 'Ancho (m)',
                } : undefined}
                format={format}
            />
        </div>
    )
}
