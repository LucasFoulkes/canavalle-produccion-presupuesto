import { createFileRoute } from '@tanstack/react-router'
import * as React from 'react'
import { useDeferredLiveQuery } from '@/hooks/use-deferred-live-query'
import { DataTable } from '@/components/data-table'
import { DataTableSkeleton } from '@/components/data-table-skeleton'
import { formatDate, formatMax2 } from '@/lib/utils'
import { useFilteredRows, useTableFilter } from '@/hooks/use-table-filter'
import { fetchResumenFenologico, ResumenFenologicoResult } from '@/lib/resumen-fenologico'
import { buildPredictionTimeline, scaleTimelineToTotals } from '@/lib/predicciones'

export const Route = createFileRoute('/predicciones/cosecha')({
    component: CosechaPage,
})

function CosechaPage() {
    const { registerColumns } = useTableFilter()
    const { data, loading } = useDeferredLiveQuery<ResumenFenologicoResult | undefined>(
        () => fetchResumenFenologico(),
        [],
        { defer: false },
    )

    const timelineRows = React.useMemo(() => {
        const base = buildPredictionTimeline(data)
        return scaleTimelineToTotals(base)
    }, [data])

    const rows = React.useMemo(() => {
        return (timelineRows || []).filter((r) => Number((r as any)?.dias_cosecha || 0) > 0)
    }, [timelineRows])

    const columns = React.useMemo(
        () => [
            { key: 'fecha', header: 'Fecha', render: (v: any) => formatDate(v) },
            { key: 'finca', header: 'Finca' },
            { key: 'bloque', header: 'Bloque' },
            { key: 'variedad', header: 'Variedad' },
            { key: 'dias_cosecha', header: 'Cosecha', render: (v: any) => formatMax2(v) },
        ],
        [],
    )

    React.useEffect(() => {
        registerColumns(columns.map((c: any) => ({ key: String(c.key), label: c.header || String(c.key) })))
    }, [columns, registerColumns])

    const filteredRows = useFilteredRows(rows, columns as any)

    return (
        <div className="h-full min-h-0 min-w-0 flex flex-col overflow-hidden">
            {loading ? (
                <DataTableSkeleton columns={columns as any} rows={8} />
            ) : (
                <DataTable
                    caption={`${filteredRows?.length ?? 0}`}
                    columns={columns as any}
                    rows={filteredRows ?? []}
                    getRowKey={(row: any) => row.rowKey}
                />
            )}
        </div>
    )
}
