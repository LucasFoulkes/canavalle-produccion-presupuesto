import { createFileRoute } from '@tanstack/react-router'
import DataTable from '@/components/data-table'
import { useEffect, useState } from 'react'
import { fetchTable } from '@/services/tables'

export const Route = createFileRoute('/$table')({
    component: TableRoute,
})

function TableRoute() {
    const params = Route.useParams()
    const tableName = params.table
    const [rows, setRows] = useState<Array<Record<string, unknown>>>([])
    const [columns, setColumns] = useState<string[] | undefined>(undefined)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)

    useEffect(() => {
        let alive = true
        ;(async () => {
            setLoading(true)
            setError(null)
            try {
                // 1) cache-first immediate render
                const cached = await fetchTable(tableName, { strategy: 'cache-first' })
                if (alive) {
                    setRows(cached.rows)
                    setColumns(cached.columns)
                    setLoading(false)
                }
                // 2) network-first refresh and update if different
                const fresh = await fetchTable(tableName, { strategy: 'network-first' })
                if (alive) {
                    setRows(fresh.rows)
                    setColumns(fresh.columns)
                }
            } catch (err) {
                if (alive) setError(err instanceof Error ? err.message : 'Error cargando datos')
                if (alive) setLoading(false)
            }
        })()
        return () => {
            alive = false
        }
    }, [tableName])

    return (
        <div className="flex-1 min-h-0 overflow-auto w-full">
            <div className="px-2 min-w-full">
                <DataTable
                    data={rows}
                    loading={loading}
                    error={error}
                    caption={`${rows.length}`}
                    columns={columns}
                />
            </div>
        </div>
    )
}
