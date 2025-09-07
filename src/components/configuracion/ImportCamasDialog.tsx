import { useState, useRef } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogClose } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import * as XLSX from 'xlsx'
import { camasService } from '@/services/camas.service'
import { Variedad } from '@/services/variedades.service'
import { gruposPlantacionService } from '@/services/grupos-plantacion.service'

interface ImportCamasDialogProps {
    variedades: Variedad[]
    bloqueId?: number | null
    onImported?: () => void
    triggerClassName?: string
}

interface ParsedRow {
    [key: string]: any
}

const REQUIRED_FIELDS = ['nombre', 'variedad', 'area'] as const

type RequiredField = typeof REQUIRED_FIELDS[number]

export function ImportCamasDialog({ variedades, bloqueId, onImported, triggerClassName }: ImportCamasDialogProps) {
    const [open, setOpen] = useState(false)
    const [rawHeaders, setRawHeaders] = useState<string[]>([])
    const [rows, setRows] = useState<ParsedRow[]>([])
    const [mapping, setMapping] = useState<Record<RequiredField, string>>({ nombre: '', variedad: '', area: '' })
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const fileInputRef = useRef<HTMLInputElement | null>(null)

    const reset = () => {
        setRawHeaders([])
        setRows([])
        setMapping({ nombre: '', variedad: '', area: '' })
        setError(null)
    }

    const handleFile = async (file: File) => {
        reset()
        try {
            const data = await file.arrayBuffer()
            const wb = XLSX.read(data, { type: 'array' })
            const ws = wb.Sheets[wb.SheetNames[0]]
            const json: ParsedRow[] = XLSX.utils.sheet_to_json(ws, { defval: '' })
            if (!json.length) {
                setError('Archivo vacío')
                return
            }
            const headers = Object.keys(json[0])
            setRawHeaders(headers)
            setRows(json)
        } catch (e) {
            setError('No se pudo leer el archivo')
        }
    }

    const handleSubmit = async () => {
        if (!bloqueId) {
            setError('Seleccione un bloque antes de importar')
            return
        }
        // Validate mapping
        for (const f of REQUIRED_FIELDS) {
            if (!mapping[f]) {
                setError('Complete el mapeo de columnas requerido')
                return
            }
        }
        setLoading(true)
        setError(null)
        try {
            const varietyNameToId = new Map(variedades.map(v => [v.nombre.toLowerCase(), (v as any).id_variedad as number]))
            let created = 0
            for (const r of rows) {
                const nombre = String(r[mapping.nombre]).trim()
                if (!nombre) continue
                const variedadNombre = String(r[mapping.variedad]).trim().toLowerCase()
                const variedadId = varietyNameToId.get(variedadNombre)
                if (!variedadId) continue // skip unknown variety
                const areaValue = parseFloat(String(r[mapping.area]).replace(',', '.'))
                if (isNaN(areaValue) || areaValue <= 0) continue
                // Ensure a grupo exists for this bloque + variedad, then create cama in that grupo
                let grupo = (await gruposPlantacionService.getByBloqueId(bloqueId)).find((g: any) => !g.eliminado_en && (g.id_variedad === variedadId || (g as any).variedad_id === variedadId))
                if (!grupo) {
                    const created = await gruposPlantacionService.upsert({
                        id_bloque: bloqueId as any,
                        id_variedad: variedadId as any,
                        fecha_siembra: new Date().toISOString(),
                    } as any)
                    if (!created) continue
                    grupo = created as any
                }
                await camasService.upsertCama({ nombre, id_grupo: (grupo as any).id_grupo ?? (grupo as any).grupo_id })
                created++
            }
            onImported?.()
            setOpen(false)
            reset()
            console.log(`Imported ${created} camas`)
        } catch (e) {
            setError('Error importando camas')
        } finally {
            setLoading(false)
        }
    }

    return (
        <Dialog open={open} onOpenChange={(o) => { if (!o) reset(); setOpen(o) }}>
            <DialogTrigger asChild>
                <Button className={triggerClassName}>Importar camas</Button>
            </DialogTrigger>
            <DialogContent className="max-w-3xl w-[min(100%-1rem,900px)]">
                <DialogHeader>
                    <DialogTitle>Importar camas</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 text-sm">
                    <div>
                        <input
                            ref={fileInputRef}
                            type="file"
                            accept=".csv, application/vnd.ms-excel, application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
                            onChange={(e) => {
                                const file = e.target.files?.[0]
                                if (file) handleFile(file)
                            }}
                            className="block w-full rounded border p-2 text-xs"
                        />
                        <p className="mt-1 text-[11px] text-gray-500">Formatos aceptados: CSV, XLS, XLSX</p>
                    </div>
                    {rawHeaders.length > 0 && (
                        <div className="space-y-3 max-h-[55vh] overflow-hidden">
                            <p className="font-medium text-xs uppercase tracking-wide text-gray-600">Mapear columnas</p>
                            <div className="grid gap-3 sm:grid-cols-3">
                                {REQUIRED_FIELDS.map(f => (
                                    <div key={f} className="space-y-1">
                                        <label className="text-[11px] font-medium text-gray-600">{f}</label>
                                        <select
                                            value={mapping[f]}
                                            onChange={(e) => setMapping(m => ({ ...m, [f]: e.target.value }))}
                                            className="w-full rounded border bg-background px-2 py-1 text-xs"
                                        >
                                            <option value="">-- columna --</option>
                                            {rawHeaders.map(h => <option key={h} value={h}>{h}</option>)}
                                        </select>
                                    </div>
                                ))}
                            </div>
                            <div className="rounded border overflow-auto">
                                <div className="min-w-fit">
                                    <table className="text-[11px]">
                                        <thead className="sticky top-0 bg-gray-100">
                                            <tr>
                                                {rawHeaders.map(h => <th key={h} className="px-2 py-1 text-left font-medium whitespace-nowrap">{h}</th>)}
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {rows.slice(0, 50).map((r, i) => (
                                                <tr key={i} className="odd:bg-gray-50">
                                                    {rawHeaders.map(h => <td key={h} className="px-2 py-1 truncate max-w-[160px] whitespace-nowrap">{String(r[h])}</td>)}
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                            <p className="text-[10px] text-gray-500">Mostrando primeras {Math.min(50, rows.length)} filas de {rows.length}.</p>
                        </div>
                    )}
                    {error && <p className="text-xs text-red-500">{error}</p>}
                </div>
                <DialogFooter>
                    <DialogClose asChild>
                        <Button variant="outline" size="sm">Cerrar</Button>
                    </DialogClose>
                    <Button size="sm" disabled={loading || rows.length === 0} onClick={handleSubmit}>{loading ? 'Importando...' : 'Importar'}</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}
