import { createFileRoute } from '@tanstack/react-router'
import DataTable from '@/components/data-table'
import ScrollContainer from '@/components/ui/scroll'
import type React from 'react'
import { useEffect, useState } from 'react'
import { fetchTableView } from '@/services/table-views'

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
                    const result = await fetchTableView(tableName)
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
        <ScrollContainer className="flex-1 min-h-0 w-full">
            <div className="px-2 min-w-full">
                {/** Column-specific formatters per table (extend as needed) */}
                {(() => {
                    let format: Record<string, (value: unknown, row: Record<string, unknown>, key: string) => React.ReactNode> | undefined
                    if (tableName === 'usuario') {
                        format = {
                            // Render cedula as plain text (no numeric formatting)
                            cedula: (val) => (val == null ? '—' : String(val)),
                        }
                    }
                    return (
                        <DataTable
                            data={rows}
                            loading={loading}
                            error={error}
                            caption={`${rows.length}`}
                            columns={columns}
                            format={format}
                        />
                    )
                })()}
            </div>
        </ScrollContainer>
    )
}
