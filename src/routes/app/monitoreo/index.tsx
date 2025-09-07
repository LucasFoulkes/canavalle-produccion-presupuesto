import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { Button } from '@/components/ui/button'
import { useState, useEffect } from 'react'
import { fincasService, Finca } from '@/services/fincas.service'

export const Route = createFileRoute('/app/monitoreo/')({
    component: MonitoreoComponent,
})

function FincaCard({ finca }: { finca: Finca }) {
    const navigate = useNavigate()
    return (
        <Button
            className='aspect-square w-full h-full capitalize text-lg'
            key={(finca as any).id_finca}
            onClick={() => {
                console.log('Selected finca:', finca)
                navigate({
                    to: '/app/monitoreo/bloques',
                    search: {
                        fincaId: (finca as any).id_finca,
                        fincaName: finca.nombre,
                    }
                })
            }}
        >
            {finca.nombre}
        </Button>
    )
}

function MonitoreoComponent() {
    const [fincas, setFincas] = useState<Finca[]>([])
    const [isLoading, setIsLoading] = useState(true)

    useEffect(() => {
        loadFincas()
    }, [])

    const loadFincas = async () => {
        try {
            setIsLoading(true)
            const fincasData = await fincasService.getAllFincas()
            setFincas(fincasData)
        } catch (error) {
            console.error('Error loading fincas:', error)
        } finally {
            setIsLoading(false)
        }
    }

    return (
        <div className="flex h-full flex-col p-2 pb-0 gap-2">
            <h1 className='text-2xl font-thin'>
                Seleccione una finca
            </h1>
            {isLoading && <p>Cargando fincas...</p>}
            {!isLoading && (
                <div className='flex-1 grid grid-cols-2 gap-2 content-center'>
                    {fincas.map((finca) => (
                        <FincaCard key={(finca as any).id_finca} finca={finca} />
                    ))}
                </div>
            )}
        </div>
    )
}