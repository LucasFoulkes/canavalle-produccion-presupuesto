import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useEffect, useState } from 'react'
import { db } from '@/lib/dexie'
import { Button } from '@/components/ui/button'
// notas removed – textarea no longer used
import { ChevronLeft, ArrowDown } from 'lucide-react'
import { observacionesService } from '@/services/observaciones.service'
import { isEstadoTracked } from '@/lib/preferences'

interface SearchShape {
    camaId: number
    camaName: string
    bloqueId: number
    bloqueName: string
    fincaId: number
    fincaName: string
}

export const Route = createFileRoute('/app/monitoreo/cama')({
    component: CamaDetailPage,
    validateSearch: (s): SearchShape => ({
        camaId: Number(s.camaId),
        camaName: String(s.camaName || 'Cama'),
        bloqueId: Number(s.bloqueId),
        bloqueName: String(s.bloqueName || 'Bloque'),
        fincaId: Number(s.fincaId),
        fincaName: String(s.fincaName || 'Finca')
    })
})

function SplitCountButton({ label, value, onChange }: { label: string; value: number; onChange: (v: number) => void }) {
    return (
        <div className='relative h-14 rounded-md overflow-hidden border bg-white'>
            {/* Full-width area to increase; padded so label is not under the overlays */}
            <Button
                variant='ghost'
                className='w-full h-full px-3 py-2 text-sm font-medium justify-center rounded-none pl-12 pr-12'
                onClick={() => onChange(value + 1)}
            >
                {label}
            </Button>
            {/* Left: decrease (fixed width) */}
            <Button
                type='button'
                variant='secondary'
                className='absolute left-0 top-0 h-full w-12 rounded-none border-r'
                onClick={(e) => { e.stopPropagation(); onChange(Math.max(0, value - 1)) }}
            >
                <ArrowDown className='h-5 w-5' />
            </Button>
            {/* Right: value display and increment */}
            <Button
                type='button'
                variant='secondary'
                className='absolute right-0 top-0 h-full w-12 rounded-none border-l text-lg font-semibold'
                onClick={(e) => { e.stopPropagation(); onChange(value + 1) }}
            >
                {value}
            </Button>
        </div>
    )
}

function CamaDetailPage() {
    const navigate = useNavigate()
    const { camaId, camaName, bloqueId, bloqueName, fincaId, fincaName } = Route.useSearch()
    const [tipos, setTipos] = useState<any[]>([])
    const [counts, setCounts] = useState<Record<string, number>>({})

    useEffect(() => {
        load()
    }, [camaId])

    async function load() {
        const list = await observacionesService.listTipos()
        // Filter by tracked set; default to active ones if no selection saved
        const filtered = (list || [])
            .filter((t: any) => t.activo !== false)
            .filter((t: any) => isEstadoTracked(t.codigo, true))
        setTipos(filtered)
        // load existing counts for today
        const today = new Date().toISOString().slice(0, 10)
        const rows = await db.observacion.where('id_cama').equals(camaId).and(o => (o.creado_en ?? '').startsWith(today)).toArray()
        const byTipo: Record<string, number> = {}
        for (const r of rows) {
            const key = (r as any).tipo_observacion ?? (r as any).estado_fenologico
            byTipo[key] = (byTipo[key] ?? 0) + (r.cantidad ?? 0)
        }
        setCounts(byTipo)
    }

    function changeCount(tipo: string, next: number) {
        setCounts(prev => ({ ...prev, [tipo]: Math.max(0, next) }))
    }

    async function save() {
        const user = await db.usuario.toCollection().first()
        const created: any[] = []
        for (const [estado_fenologico, cantidad] of Object.entries(counts)) {
            if ((cantidad ?? 0) > 0) {
                // Temporary: random short token (<=10 chars) until GPS integration
                const ubicacion = Math.random().toString(36).slice(2, 12)
                const rec = await observacionesService.upsertLocal({
                    id_cama: camaId,
                    tipo_observacion: estado_fenologico,
                    cantidad,
                    ubicacion_seccion: ubicacion,
                    id_usuario: (user as any)?.id_usuario ?? undefined,
                })
                created.push(rec)
            }
        }
        // Try online sync (best effort)
        for (const r of created) {
            try {
                await observacionesService.syncUpsert(r)
            } catch (e) {
                console.warn('[observacion] sync failed', e)
            }
        }
        navigate({ to: '/app/monitoreo/camas', search: { bloqueId, bloqueName, fincaId, fincaName } })
    }

    // Prefer showing only the cama number/name (strip leading 'Cama ' if present)
    const camaTitle = typeof camaName === 'string' ? camaName.replace(/^Cama\s+/i, '') : String(camaName)

    return (
        <div className='flex flex-col h-full p-4 gap-4'>
            <div className='flex items-center justify-center relative'>
                <ChevronLeft className='h-6 w-6 absolute left-0 cursor-pointer' onClick={() => navigate({ to: '/app/monitoreo/camas', search: { bloqueId, bloqueName, fincaId, fincaName } })} />
                <div className='text-center'>
                    <h1 className='text-xl font-semibold capitalize'>{camaTitle}</h1>
                    <div className='text-xs text-muted-foreground'>{fincaName} • Bloque {bloqueName}</div>
                </div>
            </div>

            {/* Sección removed; saving random GPS placeholder for now */}

            {/* Un listado: cada estado fenológico tiene su propia fila con +/- (scrollable) */}
            <div className='flex-1 overflow-y-auto'>
                <div className='grid grid-cols-1 gap-2 pb-2'>
                    {tipos.map(t => (
                        <SplitCountButton
                            key={t.codigo}
                            label={t.nombre}
                            value={counts[t.codigo] ?? 0}
                            onChange={v => changeCount(t.codigo, v)}
                        />
                    ))}
                </div>
            </div>

            {/* Notas removed (column deleted) */}

            <div className='mt-auto'>
                <Button className='w-full h-12 text-base' onClick={save}>Guardar</Button>
            </div>
        </div>
    )
}

export default CamaDetailPage
