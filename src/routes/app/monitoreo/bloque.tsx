import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useEffect, useState } from 'react'
import { distributionService, BloqueVariedadResumenRow } from '@/services/distribution.service'
import { Button } from '@/components/ui/button'
// Badge import removed
import { ChevronLeft } from 'lucide-react'
// import { db } from '@/lib/dexie'

interface SearchShape {
    bloqueId: number
    bloqueName: string
    fincaId: number
    fincaName: string
}

export const Route = createFileRoute('/app/monitoreo/bloque')({
    component: BloqueDetailPage,
    validateSearch: (s): SearchShape => ({
        bloqueId: Number(s.bloqueId),
        bloqueName: String(s.bloqueName || 'Bloque'),
        fincaId: Number(s.fincaId),
        fincaName: String(s.fincaName || 'Finca')
    })
})

// aggregation removed (server provides resumen)

function BloqueDetailPage() {
    const navigate = useNavigate()
    const { bloqueId, bloqueName, fincaId, fincaName } = Route.useSearch()
    const [rows, setRows] = useState<BloqueVariedadResumenRow[]>([])
    const [loading, setLoading] = useState(false)
    // Ranges derived from server data; no local state needed

    useEffect(() => {
        load()
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [bloqueId])

    const load = async () => {
        try {
            setLoading(true)
            const data = await distributionService.getVariedadesByBloqueId(bloqueId)
            setRows(data)
            // Range information is inferred when rendering based on numero_camas
        } catch (e) {
            console.warn('Error loading distribution', e)
        } finally {
            setLoading(false)
        }
    }
    // Ranges removed; server view provides numero_camas/total_plantas directly

    return (
        <div className='flex flex-col h-full p-4 gap-6'>
            <div className='flex items-center justify-center relative'>
                <ChevronLeft
                    className='h-6 w-6 absolute left-0 cursor-pointer'
                    onClick={() => navigate({ to: '/app/monitoreo/bloques', search: { fincaId, fincaName } })}
                />
                <div className='text-center'>
                    <h1 className='text-2xl font-thin'>{bloqueName}</h1>
                    <p className='text-sm text-gray-500'>{fincaName}</p>
                </div>
            </div>
            {/* Search input removed per request */}
            <div className='flex-1 flex flex-col'>
                {loading && <p className='text-xs text-muted-foreground text-center mt-4'>Cargando...</p>}
                {!loading && rows.length === 0 && (
                    <div className='flex flex-1 items-center justify-center'>
                        <p className='text-xs text-muted-foreground'>Sin datos</p>
                    </div>
                )}
                {!loading && rows.length > 0 && (
                    <div className='flex-1 grid grid-cols-1 gap-3 content-center'>
                        {(() => {
                            let start = 1
                            return rows.map(v => {
                                const count = typeof v.numero_camas === 'number' && v.numero_camas > 0 ? v.numero_camas : 0
                                let rangeText = '—'
                                if (count > 0) {
                                    const end = start + count - 1
                                    rangeText = count === 1
                                        ? `${start}`
                                        : `${start} - ${end}`
                                    start = end + 1
                                }
                                return (
                                    <Button
                                        key={v.id_variedad}
                                        className='h-14 w-full text-lg bg-black text-white hover:bg-black/90 flex items-center justify-between px-4'
                                        onClick={() => navigate({
                                            to: '/app/monitoreo/camas',
                                            search: { bloqueId, bloqueName, fincaId, fincaName, varietyId: v.id_variedad }
                                        })}
                                    >
                                        <span className='font-medium truncate'>
                                            {v.nombre_variedad}
                                        </span>
                                        <span className="ml-4 text-xs font-light text-white/80 tracking-wide whitespace-nowrap">
                                            {rangeText}
                                        </span>
                                    </Button>
                                )
                            })
                        })()}
                    </div>
                )}
            </div>
        </div>
    )
}

export default BloqueDetailPage
