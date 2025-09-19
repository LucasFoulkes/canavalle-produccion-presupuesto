import { createFileRoute } from '@tanstack/react-router'
import * as React from 'react'
import { useDeferredLiveQuery } from '@/hooks/use-deferred-live-query'
import { DataTable } from '@/components/data-table'
import { DataTableSkeleton } from '@/components/data-table-skeleton'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { formatDate, formatInt } from '@/lib/utils'
import { useTableFilter, useFilteredRows } from '@/hooks/use-table-filter'
import {
  fetchResumenFenologico,
  formatResumenStageRich,
  ResumenFenologicoResult,
  ResumenFenologicoRow,
  STAGE_KEYS,
  STAGE_LABELS,
} from '@/lib/resumen-fenologico'

export const Route = createFileRoute('/estimados/estimados-resumen' as any)({
  component: Page,
})

function Page() {
  const { registerColumns } = useTableFilter()
  const { data, loading } = useDeferredLiveQuery<ResumenFenologicoResult | undefined>(
    () => fetchResumenFenologico(),
    [],
    { defer: false },
  )

  const rows = data?.rows ?? []
  const estadoMap = data?.estados
  const [dialogOpen, setDialogOpen] = React.useState(false)
  const [selectedKey, setSelectedKey] = React.useState<string | null>(null)

  const selectedRow = React.useMemo(() => {
    if (!selectedKey) return null
    return rows.find((row) => row.rowKey === selectedKey) ?? null
  }, [rows, selectedKey])

  const selectedEstados = React.useMemo(() => {
    if (!selectedRow || !estadoMap) return [] as any[]
    const key = `${selectedRow.bloqueId}|${selectedRow.variedadId}|${selectedRow.fincaId}`
    const matches = estadoMap.get(key) ?? []
    const toMillis = (value: any) => {
      if (!value) return -Infinity
      const d = new Date(value)
      return Number.isNaN(d.getTime()) ? -Infinity : d.getTime()
    }
    return [...matches].sort((a, b) => toMillis((b as any)?.creado_en ?? (b as any)?.fecha ?? (b as any)?.actualizado_en) - toMillis((a as any)?.creado_en ?? (a as any)?.fecha ?? (a as any)?.actualizado_en))
  }, [estadoMap, selectedRow])

  const renderStage = (key: typeof STAGE_KEYS[number]) => (value: number, row: ResumenFenologicoRow) => {
    const pct = row?.[`${key}_pct` as keyof ResumenFenologicoRow] as number | undefined
    const display = formatResumenStageRich(value, Number(pct ?? 0))
    if (!display) return null
    return (
      <span className="whitespace-nowrap">
        {display.inline}{' '}
        <span className="text-muted-foreground text-[0.7rem]">({display.pct}%)</span>
      </span>
    )
  }
  const columns = React.useMemo(() => ([
    { key: 'finca', header: 'Finca' },
    { key: 'bloque', header: 'Bloque' },
    { key: 'variedad', header: 'Variedad' },
    { key: 'fecha', header: 'Fecha', render: (v: any) => formatDate(v) },
    { key: 'dias_brotacion', header: STAGE_LABELS.dias_brotacion, render: renderStage('dias_brotacion') },
    { key: 'dias_cincuenta_mm', header: STAGE_LABELS.dias_cincuenta_mm, render: renderStage('dias_cincuenta_mm') },
    { key: 'dias_quince_cm', header: STAGE_LABELS.dias_quince_cm, render: renderStage('dias_quince_cm') },
    { key: 'dias_veinte_cm', header: STAGE_LABELS.dias_veinte_cm, render: renderStage('dias_veinte_cm') },
    { key: 'dias_primera_hoja', header: STAGE_LABELS.dias_primera_hoja, render: renderStage('dias_primera_hoja') },
    { key: 'dias_espiga', header: STAGE_LABELS.dias_espiga, render: renderStage('dias_espiga') },
    { key: 'dias_arroz', header: STAGE_LABELS.dias_arroz, render: renderStage('dias_arroz') },
    { key: 'dias_arveja', header: STAGE_LABELS.dias_arveja, render: renderStage('dias_arveja') },
    { key: 'dias_garbanzo', header: STAGE_LABELS.dias_garbanzo, render: renderStage('dias_garbanzo') },
    { key: 'dias_uva', header: STAGE_LABELS.dias_uva, render: renderStage('dias_uva') },
    { key: 'dias_rayando_color', header: STAGE_LABELS.dias_rayando_color, render: renderStage('dias_rayando_color') },
    { key: 'dias_sepalos_abiertos', header: STAGE_LABELS.dias_sepalos_abiertos, render: renderStage('dias_sepalos_abiertos') },
    { key: 'dias_cosecha', header: STAGE_LABELS.dias_cosecha, render: renderStage('dias_cosecha') },
  ]), []) as any

  // Register columns (excluding computed *_pct) once
  React.useEffect(() => {
    registerColumns(columns.map((c: any) => ({ key: String(c.key), label: c.header || String(c.key) })))
  }, [columns, registerColumns])

  const filteredRows = useFilteredRows(rows, columns)

  return (
    <div className="h-full min-h-0 min-w-0 flex flex-col overflow-hidden">
      {loading ? (
        <DataTableSkeleton columns={columns as any} rows={8} />
      ) : (
        <DataTable<ResumenFenologicoRow>
          caption={`${filteredRows?.length ?? 0}`}
          columns={columns}
          rows={filteredRows ?? []}
          getRowKey={(row) => row.rowKey}
          onRowClick={(row) => {
            setSelectedKey(row.rowKey)
            setDialogOpen(true)
          }}
        />
      )}
      <Dialog
        open={dialogOpen}
        onOpenChange={(open) => {
          setDialogOpen(open)
          if (!open) setSelectedKey(null)
        }}
      >
        <DialogContent className="sm:max-w-4xl">
          <DialogHeader>
            <DialogTitle>Estados fenologicos</DialogTitle>
            {selectedRow ? (
              <DialogDescription>
                <span className="font-medium">Finca:</span> {selectedRow.finca}{' '}
                <span className="font-medium">Bloque:</span> {selectedRow.bloque}{' '}
                <span className="font-medium">Variedad:</span> {selectedRow.variedad}
              </DialogDescription>
            ) : null}
          </DialogHeader>
          {selectedEstados.length > 0 ? (
            <div className="space-y-4">
              {selectedEstados.map((estado, index) => {
                const estadoId = String((estado as any)?.id_estado_fenologico ?? index)
                const displayDate = formatDate(
                  (estado as any)?.creado_en ?? (estado as any)?.fecha ?? (estado as any)?.actualizado_en
                )
                return (
                  <div key={estadoId} className="rounded-md border border-border/60 p-3 space-y-3">
                    <div className="flex flex-wrap items-center justify-between gap-2 text-sm text-muted-foreground">
                      <div>
                        <span className="font-medium text-foreground">Registro:</span> {estadoId}
                      </div>
                      {displayDate ? <div>Fecha: {displayDate}</div> : null}
                    </div>
                    <table className="w-full table-fixed border-collapse text-sm">
                      <tbody>
                        {STAGE_KEYS.map((stage) => {
                          const value = (estado as any)?.[stage]
                          if (value === undefined || value === null) return null
                          const numeric = Number(value)
                          const rendered = Number.isFinite(numeric)
                            ? formatInt(numeric)
                            : String(value)
                          return (
                            <tr key={stage} className="border-b last:border-b-0">
                              <td className="w-1/2 px-2 py-1.5 font-medium text-foreground">{STAGE_LABELS[stage]}</td>
                              <td className="w-1/2 px-2 py-1.5 text-right">{rendered}</td>
                            </tr>
                          )
                        })}
                      </tbody>
                    </table>
                  </div>
                )
              })}
            </div>
          ) : (
            <div className="text-sm text-muted-foreground">
              Sin registros de estados fenologicos para esta combinacion.
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
//
