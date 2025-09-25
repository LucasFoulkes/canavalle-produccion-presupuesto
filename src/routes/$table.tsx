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
            ; (async () => {
                setLoading(true)
                try {
                    const result = await fetchTable(tableName)
                    if (alive) {
                        setRows(result.rows)
                        setColumns(result.columns)
                        // no column labels; use raw column names
                        // keyField no longer used by DataTable
                    }
                } catch (err) {
                    if (alive) setError(err instanceof Error ? err.message : 'Error cargando datos')
                } finally {
                    if (alive) setLoading(false)
                }
            })()
        return () => {
            alive = false
        }
    }, [tableName])

    return (
        <div>
            <DataTable
                data={rows}
                loading={loading}
                error={error}
                caption={`${rows.length}`}
                columns={columns}
            />
        </div>
    )
}
