import { createFileRoute } from '@tanstack/react-router'
import { Button } from '@/components/ui/button'
import { useState, useEffect } from 'react'
import { camasService, Cama } from '@/services/camas.service'

type CamasSearch = {
    bloqueId: number
    bloqueName: string
    fincaId: number
    fincaName: string
}

export const Route = createFileRoute('/app/monitoreo/camas')({
    component: CamasComponent,
    validateSearch: (search): CamasSearch => {
        return {
            bloqueId: Number(search.bloqueId),
            bloqueName: String(search.bloqueName || 'Bloque'),
            fincaId: Number(search.fincaId),
            fincaName: String(search.fincaName || 'Finca')
        }
    }
})

function CamaCard({ cama }: { cama: Cama }) {
    return (
        <Button
            className='aspect-square w-full h-full capitalize text-lg'
            key={cama.id}
            onClick={() => {
                console.log('Selected cama:', cama)
                alert(`Selected cama: ${cama.nombre}\n(Next level not implemented yet)`)
            }}
        >
            {cama.nombre}
        </Button>
    )
}

function CamasComponent() {
    const [camas, setCamas] = useState<Cama[]>([])
    const [isLoading, setIsLoading] = useState(true)
    const { bloqueId, bloqueName, fincaName } = Route.useSearch()

    useEffect(() => {
        if (bloqueId) {
            loadCamas()
        }
    }, [bloqueId])

    const loadCamas = async () => {
        try {
            setIsLoading(true)
            const camasData = await camasService.getCamasByBloqueId(bloqueId)
            setCamas(camasData)
        } catch (error) {
            console.error('Error loading camas:', error)
        } finally {
            setIsLoading(false)
        }
    }

    return (
        <div className="flex h-full flex-col p-2 gap-2">
            <div>
                <h1 className='text-2xl font-thin capitalize'>
                    {bloqueName}
                </h1>
                <p className='text-sm text-gray-500'>
                    {fincaName} • Seleccione una cama
                </p>
            </div>
            {isLoading && <p>Cargando camas...</p>}
            {!isLoading && (
                <div className='flex-1 overflow-y-auto'>
                    {camas.length > 0 ? (
                        <div className='grid grid-cols-4 gap-2 min-h-full content-center place-items-center'>
                            {
                                camas.map((cama) => (
                                    <CamaCard key={cama.id} cama={cama} />
                                ))
                            }
                        </div>
                    ) : (
                        <div className='flex h-full w-full items-center justify-center'>
                            <p className="text-gray-500 font-thin">No se encontraron camas para este bloque</p>
                        </div>
                    )}
                </div>
            )}
        </div>
    )
}
