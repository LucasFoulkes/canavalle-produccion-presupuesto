import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { Button } from '@/components/ui/button'
import { useState, useEffect } from 'react'
import { bloquesService, Bloque } from '@/services/bloques.service'

type BloquesSearch = {
    fincaId: number
    fincaName: string
}

export const Route = createFileRoute('/app/monitoreo/bloques')({
    component: BloquesComponent,
    validateSearch: (search): BloquesSearch => {
        return {
            fincaId: Number(search.fincaId),
            fincaName: String(search.fincaName || 'Finca')
        }
    }
})

function BloqueCard({ bloque }: { bloque: Bloque }) {
    const navigate = useNavigate()
    const { fincaId, fincaName } = Route.useSearch()

    return (
        <Button
            className='aspect-square w-full h-full capitalize text-lg'
            key={bloque.id}
            onClick={() => {
                console.log('Selected bloque:', bloque)
                navigate({
                    to: '/app/monitoreo/camas',
                    search: {
                        bloqueId: bloque.id,
                        bloqueName: bloque.nombre,
                        fincaId: fincaId,
                        fincaName: fincaName,
                    }
                })
            }}
        >
            {bloque.nombre}
        </Button>
    )
}

function BloquesComponent() {
    const [bloques, setBloques] = useState<Bloque[]>([])
    const [isLoading, setIsLoading] = useState(true)
    const { fincaId, fincaName } = Route.useSearch()

    useEffect(() => {
        if (fincaId) {
            loadBloques()
        }
    }, [fincaId])

    const loadBloques = async () => {
        try {
            setIsLoading(true)
            const bloquesData = await bloquesService.getBloquesByFincaId(fincaId)
            setBloques(bloquesData)
        } catch (error) {
            console.error('Error loading bloques:', error)
        } finally {
            setIsLoading(false)
        }
    }

    return (
        <div className="flex h-full flex-col p-2 gap-2 pb-0  ">
            <div>
                <h1 className='text-2xl font-thin capitalize'>
                    {fincaName}
                </h1>
                <p className='text-sm text-gray-500'>Seleccione un bloque</p>
            </div>
            {isLoading && <p>Cargando bloques...</p>}
            {!isLoading && (
                <div className='flex-1 overflow-y-auto'>
                    {bloques.length > 0 ? (
                        <div className='grid grid-cols-4 gap-2 min-h-full content-center place-items-center'>
                            {
                                bloques.map((bloque) => (
                                    <BloqueCard key={bloque.id} bloque={bloque} />
                                ))
                            }
                        </div>
                    ) : (
                        <div className='flex h-full w-full items-center justify-center'>
                            <p className="text-gray-500 font-thin">No se encontraron bloques para esta finca</p>
                        </div>
                    )}
                </div>
            )
            }
        </div >
    )
}
