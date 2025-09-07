import { Input } from '@/components/ui/input'
import { createFileRoute } from '@tanstack/react-router'
import { Button } from '@/components/ui/button'
import { useState, useEffect } from 'react'
import { camasService, Cama } from '@/services/camas.service'
import { db } from '@/lib/dexie'
import { ChevronLeft, X } from 'lucide-react'
import { useNavigate } from '@tanstack/react-router'

type CamasSearch = {
    bloqueId: number
    bloqueName: string
    fincaId: number
    fincaName: string
    varietyId?: number
    cama?: string
}

export const Route = createFileRoute('/app/monitoreo/camas')({
    component: CamasComponent,
    validateSearch: (search): CamasSearch => {
        return {
            bloqueId: Number(search.bloqueId),
            bloqueName: String(search.bloqueName || 'Bloque'),
            fincaId: Number(search.fincaId),
            fincaName: String(search.fincaName || 'Finca'),
            varietyId: search.varietyId !== undefined ? Number(search.varietyId) : undefined,
            cama: search.cama ? String(search.cama) : undefined,
        }
    }
})

function CamaCard({ cama, onOpen }: { cama: Cama; onOpen: (c: Cama, display: string) => void }) {
    const display = cama.nombre || `Cama ${(cama as any).id_cama}`
    return (
        <Button
            className='aspect-square w-full h-full capitalize text-lg'
            key={(cama as any).id_cama}
            onClick={() => onOpen(cama, display)}
            variant="outline"
        >
            <div className='flex items-center justify-center h-full w-full text-center px-1'>
                <span className='font-semibold text-base leading-none truncate w-full'>{display}</span>
            </div>
        </Button>
    )
}

function CamasComponent() {
    const [camas, setCamas] = useState<Cama[]>([])
    const [varietyGroupIds, setVarietyGroupIds] = useState<Set<number> | null>(null)
    const [isLoading, setIsLoading] = useState(true)
    const [filter, setFilter] = useState('')
    const { bloqueId, bloqueName, fincaName, fincaId, varietyId, cama } = Route.useSearch()
    const [varietyName, setVarietyName] = useState<string>('')
    const navigate = useNavigate()

    useEffect(() => {
        if (bloqueId) {
            loadCamas()
        }
    }, [bloqueId, varietyId])

    useEffect(() => {
        // Lookup variety name for display
        if (typeof varietyId === 'number') {
            db.variedad.get(varietyId).then(v => setVarietyName(v?.nombre || ''))
        } else {
            setVarietyName('')
        }
    }, [varietyId])

    const loadCamas = async () => {
        try {
            setIsLoading(true)
            const camasData = await camasService.getCamasByBloqueId(bloqueId)
            setCamas(camasData)
            if (typeof varietyId === 'number') {
                resolveVarietyGroupsById(varietyId)
            } else {
                setVarietyGroupIds(null)
            }
        } catch (error) {
            console.error('Error loading camas:', error)
        } finally {
            setIsLoading(false)
        }
    }

    const resolveVarietyGroupsById = async (varietyId: number) => {
        try {
            const ids = new Set<number>()
            const hasGrupoCama = db.tables.some(t => t.name === 'grupo_cama')
            if (hasGrupoCama) {
                const groups = await (db as any).grupoCama.where('id_variedad').equals(varietyId).toArray()
                groups
                    .filter((g: any) => (g.id_bloque === bloqueId || g.bloque_id === bloqueId) && !g.eliminado_en)
                    .forEach((g: any) => { const gid = g.id_grupo ?? g.grupo_id; if (gid != null) ids.add(gid) })
            } else if ((db as any).grupoPlantacion) {
                const groups = await (db as any).grupoPlantacion.where('variedad_id').equals(varietyId).toArray()
                groups.filter((g: any) => g.bloque_id === bloqueId && !g.deleted_at).forEach((g: any) => { if (g.grupo_id != null) ids.add(g.grupo_id) })
            }
            setVarietyGroupIds(ids)
            console.log('[camas] varietyId filter groups', varietyId, Array.from(ids))
        } catch (e) {
            console.error('[camas] error resolving varietyId groups', e)
            setVarietyGroupIds(new Set())
        }
    }

    // Filter camas based on the filter input
    let filteredCamas = camas.filter((c: any) => !c.eliminado_en)
    if (typeof varietyId === 'number' && varietyGroupIds) {
        filteredCamas = filteredCamas.filter(c => {
            const gid = (c as any).id_grupo
            const inGroup = gid != null && varietyGroupIds.has(gid as number)
            const direct = false // camas no longer carry bloque/variedad directly
            return inGroup || direct
        })
    }
    if (cama) {
        filteredCamas = filteredCamas.filter((c: any) => c.nombre?.startsWith(cama) || String(c.id_cama) === cama)
    }
    filteredCamas = filteredCamas.filter(c =>
        filter === '' ||
        (c.nombre && c.nombre.toString().startsWith(filter)) ||
        String((c as any).id_cama).startsWith(filter)
    )

    return (
        <div className='w-full h-full flex flex-col gap-2 p-2 pb-0'>
            <div className="flex items-center justify-center relative">
                <ChevronLeft
                    className="h-6 w-6 absolute left-2 cursor-pointer"
                    onClick={() => navigate({
                        to: '/app/monitoreo/bloque',
                        search: { bloqueId, bloqueName, fincaId, fincaName }
                    })}
                />
                <div>
                    <h1 className='text-2xl font-thin capitalize'>
                        {bloqueName}
                    </h1>
                    <p className='text-sm text-gray-500'>{fincaName} • Seleccione una cama</p>
                </div>
            </div>
            {typeof varietyId === 'number' && varietyName && (
                <div className='flex items-center gap-2 bg-black text-white px-3 py-2 rounded-md text-sm justify-between'>
                    <span className='truncate'>Variedad: <strong className='font-semibold'>{varietyName}</strong></span>
                    <Button
                        size='sm'
                        variant='secondary'
                        className='h-6 px-2 text-xs'
                        onClick={() => navigate({
                            to: '/app/monitoreo/camas',
                            search: { bloqueId, bloqueName, fincaId, fincaName }
                        })}
                    ><X className='h-3 w-3' /></Button>
                </div>
            )}
            <div className='flex gap-2'>
                <Input
                    type="number"
                    inputMode="numeric"
                    placeholder="Encontrar cama..."
                    value={filter}
                    onChange={(e) => setFilter(e.target.value)}
                />
                <Button variant='secondary' onClick={loadCamas} disabled={isLoading}>Refrescar</Button>
            </div>
            <div className='flex-1 overflow-y-auto'>
                <div className='grid grid-cols-4 gap-2 min-h-full content-center place-items-center'>
                    {isLoading && <p className='col-span-5 text-center'>Cargando camas...</p>}
                    {!isLoading && filteredCamas.length === 0 && (
                        <p className='col-span-4 text-center text-sm text-muted-foreground'>No hay camas para este bloque</p>
                    )}
                    {!isLoading && filteredCamas.map(cama => (
                        <CamaCard
                            key={(cama as any).id_cama}
                            cama={cama}
                            onOpen={(c, display) =>
                                navigate({
                                    to: '/app/monitoreo/cama',
                                    search: { camaId: (c as any).id_cama, camaName: display, bloqueId, bloqueName, fincaId, fincaName }
                                })
                            }
                        />
                    ))}
                </div>
            </div></div>
    )
}
