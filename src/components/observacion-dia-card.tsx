import * as React from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { ChevronLeft, ChevronRight, Download } from 'lucide-react'
import { DataTable } from '@/components/data-table'
import { Combobox, type ComboOption } from '@/components/ui/combobox'
import * as XLSX from 'xlsx'
import type { Formatter } from '@/components/data-table'

type ObservacionDiaCardProps = {
    rows: Array<Record<string, unknown>>
    columns: string[]
    error: string | null
    isLoading: boolean
}

export function ObservacionDiaCard({ rows, columns: _columns, error, isLoading }: ObservacionDiaCardProps) {
    // Initialize with today's date
    const [selectedDate, setSelectedDate] = React.useState(() => {
        const now = new Date()
        return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`
    })

    // Filter states
    const [finca, setFinca] = React.useState<string>('')
    const [bloque, setBloque] = React.useState<string>('')
    const [variedad, setVariedad] = React.useState<string>('')

    // Filter and aggregate rows by finca, bloque, variedad
    const filteredRows = React.useMemo(() => {
        // First filter by date and user filters
        const dateFiltered = rows.filter(row => {
            const rowDate = String(row.fecha || '').split('T')[0].split(' ')[0]
            if (rowDate !== selectedDate) return false

            // Apply filters
            if (finca && String(row.finca) !== finca) return false
            if (bloque && String(row.bloque) !== bloque) return false
            if (variedad && String(row.variedad) !== variedad) return false

            return true
        })

        // Group by finca, bloque, variedad
        const grouped = new Map<string, {
            finca: string
            bloque: string
            variedad: string
            camas_observadas: number
            porcentaje_area: number
            [key: string]: unknown
        }>()

        for (const row of dateFiltered) {
            const key = `${row.finca}||${row.bloque}||${row.variedad}`

            if (!grouped.has(key)) {
                grouped.set(key, {
                    finca: String(row.finca || ''),
                    bloque: String(row.bloque || ''),
                    variedad: String(row.variedad || ''),
                    camas_observadas: 0,
                    porcentaje_area: 0,
                })
            }

            const group = grouped.get(key)!
            group.camas_observadas++

            // Sum porcentaje_area
            const pct = typeof row.porcentaje_area === 'number' ? row.porcentaje_area : parseFloat(String(row.porcentaje_area || '0'))
            if (Number.isFinite(pct)) {
                group.porcentaje_area += pct
            }

            // Copy other numeric columns and sum them
            for (const [k, v] of Object.entries(row)) {
                if (k === 'finca' || k === 'bloque' || k === 'variedad' || k === 'fecha' || k === 'porcentaje_area' || k.startsWith('_')) continue

                if (typeof v === 'number' && Number.isFinite(v)) {
                    if (typeof group[k] === 'number') {
                        group[k] = (group[k] as number) + v
                    } else {
                        group[k] = v
                    }
                }
            }
        }

        const result = Array.from(grouped.values())

        // Sort by finca, bloque, variedad to group bloques together
        result.sort((a, b) => {
            const fincaCmp = a.finca.localeCompare(b.finca)
            if (fincaCmp !== 0) return fincaCmp
            const bloqueCmp = a.bloque.localeCompare(b.bloque)
            if (bloqueCmp !== 0) return bloqueCmp
            return a.variedad.localeCompare(b.variedad)
        })

        // Mark bloque groups with alternating shading
        let bloqueIndex = 0
        for (let i = 0; i < result.length; i++) {
            if (i > 0) {
                const prev = result[i - 1]
                const curr = result[i]
                // New bloque if finca or bloque changed
                if (prev.finca !== curr.finca || prev.bloque !== curr.bloque) {
                    bloqueIndex++
                }
            }
            result[i]._bloqueGroup = bloqueIndex
        }

        return result
    }, [rows, selectedDate, finca, bloque, variedad])

    // Navigate to previous day
    const handlePreviousDay = React.useCallback(() => {
        const [year, month, day] = selectedDate.split('-').map(Number)
        const date = new Date(year, month - 1, day)
        date.setDate(date.getDate() - 1)
        const newDate = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
        setSelectedDate(newDate)
    }, [selectedDate])

    // Navigate to next day
    const handleNextDay = React.useCallback(() => {
        const [year, month, day] = selectedDate.split('-').map(Number)
        const date = new Date(year, month - 1, day)
        date.setDate(date.getDate() + 1)
        const newDate = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
        setSelectedDate(newDate)
    }, [selectedDate])

    // Format date for display
    const formattedDate = React.useMemo(() => {
        const [year, month, day] = selectedDate.split('-').map(Number)
        const date = new Date(year, month - 1, day)
        return date.toLocaleDateString('es-ES', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })
    }, [selectedDate])

    // Derive filter options
    const fincaOptions = React.useMemo<ComboOption[]>(() => {
        const set = new Set<string>()
        for (const r of rows) {
            const rowDate = String(r.fecha || '').split('T')[0].split(' ')[0]
            if (rowDate === selectedDate && r.finca) set.add(String(r.finca))
        }
        const opts = Array.from(set).sort((a, b) => a.localeCompare(b)).map(v => ({ label: v, value: v }))
        return [{ label: 'Todas', value: '' }, ...opts]
    }, [rows, selectedDate])

    const bloqueOptions = React.useMemo<ComboOption[]>(() => {
        const set = new Set<string>()
        for (const r of rows) {
            const rowDate = String(r.fecha || '').split('T')[0].split(' ')[0]
            if (rowDate !== selectedDate) continue
            if (finca && String(r.finca) !== finca) continue
            if (r.bloque) set.add(String(r.bloque))
        }
        const opts = Array.from(set).sort((a, b) => a.localeCompare(b)).map(v => ({ label: v, value: v }))
        return [{ label: 'Todos', value: '' }, ...opts]
    }, [rows, selectedDate, finca])

    const variedadOptions = React.useMemo<ComboOption[]>(() => {
        const set = new Set<string>()
        for (const r of rows) {
            const rowDate = String(r.fecha || '').split('T')[0].split(' ')[0]
            if (rowDate !== selectedDate) continue
            if (finca && String(r.finca) !== finca) continue
            if (bloque && String(r.bloque) !== bloque) continue
            if (r.variedad) set.add(String(r.variedad))
        }
        const opts = Array.from(set).sort((a, b) => a.localeCompare(b)).map(v => ({ label: v, value: v }))
        return [{ label: 'Todas', value: '' }, ...opts]
    }, [rows, selectedDate, finca, bloque])

    // Columns to exclude from display
    const excludedColumns = ['fecha', 'brotacion', 'primera_hoja', 'cincuenta_mm', 'quince_cm', 'veinte_cm', 'espiga', 'area_cama_m2', 'seccion', 'cosecha', 'uva']

    // Build display columns from aggregated data
    const displayColumns = React.useMemo(() => {
        if (filteredRows.length === 0) return ['finca', 'bloque', 'variedad', 'camas_observadas', 'porcentaje_area']

        const firstRow = filteredRows[0]
        const cols = Object.keys(firstRow).filter(col =>
            !col.startsWith('_') &&
            !excludedColumns.includes(col)
        )

        // Ensure camas_observadas appears after variedad
        const baseOrder = ['finca', 'bloque', 'variedad', 'camas_observadas', 'porcentaje_area']
        const ordered = baseOrder.filter(c => cols.includes(c))
        const remaining = cols.filter(c => !baseOrder.includes(c))

        return [...ordered, ...remaining]
    }, [filteredRows])

    // Custom formatter for porcentaje_area (2 decimal points)
    const formatters = React.useMemo<Record<string, Formatter>>(() => ({
        porcentaje_area: (value: unknown) => {
            const num = typeof value === 'number' ? value : parseFloat(String(value || '0'))
            return Number.isFinite(num) ? num.toFixed(2) : '—'
        }
    }), [])

    // Excel export function
    const handleExportExcel = React.useCallback(() => {
        // Create worksheet data with headers
        const wsData = [
            displayColumns,
            ...filteredRows.map(row => displayColumns.map(col => {
                const val = row[col]
                // Format porcentaje_area to 2 decimals in Excel
                if (col === 'porcentaje_area') {
                    const num = typeof val === 'number' ? val : parseFloat(String(val || '0'))
                    return Number.isFinite(num) ? parseFloat(num.toFixed(2)) : 0
                }
                return val
            }))
        ]

        // Create workbook and worksheet
        const wb = XLSX.utils.book_new()
        const ws = XLSX.utils.aoa_to_sheet(wsData)

        // Add worksheet to workbook
        XLSX.utils.book_append_sheet(wb, ws, 'Observaciones')

        // Generate filename with filters and date
        const filterParts = []
        if (finca) filterParts.push(`Finca-${finca}`)
        if (bloque) filterParts.push(`Bloque-${bloque}`)
        if (variedad) filterParts.push(`Variedad-${variedad}`)
        const filterSuffix = filterParts.length > 0 ? `_${filterParts.join('_')}` : ''
        const filename = `Observaciones_${selectedDate}${filterSuffix}.xlsx`

        // Download file
        XLSX.writeFile(wb, filename)
    }, [filteredRows, displayColumns, finca, bloque, variedad, selectedDate])

    return (
        <Card className="flex flex-col min-h-0 h-full">
            <CardHeader className="flex flex-row items-center justify-between border-b flex-shrink-0 gap-3 flex-wrap">
                <CardTitle className="flex flex-col gap-1">
                    <span>Observaciones por Cama</span>
                    <span className="text-xs font-normal text-muted-foreground capitalize">
                        {formattedDate}
                    </span>
                </CardTitle>
                <div className="flex items-center gap-2">
                    <Button
                        variant="outline"
                        size="icon"
                        onClick={handlePreviousDay}
                        aria-label="Día anterior"
                    >
                        <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <Button
                        variant="outline"
                        size="icon"
                        onClick={handleNextDay}
                        aria-label="Día siguiente"
                    >
                        <ChevronRight className="h-4 w-4" />
                    </Button>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                    <Combobox
                        className="w-[140px]"
                        options={fincaOptions}
                        placeholder="Finca"
                        onSelect={(opt) => {
                            setFinca(opt.value)
                            if (opt.value !== finca) {
                                setBloque('')
                                setVariedad('')
                            }
                        }}
                    />
                    <Combobox
                        className="w-[140px]"
                        options={bloqueOptions}
                        placeholder="Bloque"
                        onSelect={(opt) => {
                            setBloque(opt.value)
                            if (opt.value !== bloque) setVariedad('')
                        }}
                    />
                    <Combobox
                        className="w-[140px]"
                        options={variedadOptions}
                        placeholder="Variedad"
                        onSelect={(opt) => setVariedad(opt.value)}
                    />
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={handleExportExcel}
                        className="gap-2"
                    >
                        <Download className="h-4 w-4" />
                        Excel
                    </Button>
                </div>
            </CardHeader>
            <CardContent className="flex-1 min-h-0 overflow-auto p-0">
                <div className="px-4 py-4">
                    <DataTable
                        data={filteredRows}
                        columns={displayColumns}
                        loading={isLoading}
                        error={error}
                        emptyText="No hay observaciones para esta fecha"
                        format={formatters}
                    />
                </div>
            </CardContent>
        </Card>
    )
}
