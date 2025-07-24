import { Input } from '@/components/ui/input'
import { createFileRoute } from '@tanstack/react-router'
import { Button } from '@/components/ui/button'
import { useState, useEffect } from 'react'
import { camasService, Cama } from '@/services/camas.service'
import { ChevronLeft } from 'lucide-react'
import { useNavigate } from '@tanstack/react-router'

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
    const [filter, setFilter] = useState('')
    const { bloqueId, bloqueName, fincaName, fincaId } = Route.useSearch()
    const navigate = useNavigate()

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

    // Filter camas based on the filter input
    const filteredCamas = camas.filter(cama =>
        filter === '' ||
        (cama.nombre && cama.nombre.toString().startsWith(filter)) ||
        cama.id.toString().startsWith(filter)
    )

    return (
        <div className='w-full h-full flex flex-col gap-2 p-2 pb-0'>
            <div className="flex items-center justify-center relative">
                <ChevronLeft
                    className="h-6 w-6 absolute left-2 cursor-pointer"
                    onClick={() => navigate({
                        to: '/app/monitoreo/bloques',
                        search: {
                            fincaId: fincaId,
                            fincaName: fincaName,
                        }
                    })}
                />
                <div>
                    <h1 className='text-2xl font-thin capitalize'>
                        {bloqueName}
                    </h1>
                    <p className='text-sm text-gray-500'>{fincaName} • Seleccione una cama</p>
                </div>
            </div>
            <Input
                type="number"
                inputMode="numeric"
                placeholder="Filtrar camas..."
                value={filter}
                onChange={(e) => setFilter(e.target.value)}
            />
            <div className='flex-1 overflow-y-auto'>
                <div className='grid grid-cols-4 gap-2 min-h-full content-center place-items-center'>
                    {isLoading && <p className='col-span-5 text-center'>Cargando camas...</p>}
                    {!isLoading && filteredCamas.map(cama => (
                        <CamaCard
                            key={cama.id}
                            cama={cama}
                        />
                    ))}
                </div>
            </div></div>
    )
}
