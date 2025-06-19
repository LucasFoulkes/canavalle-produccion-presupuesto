import { useBloques } from '@/hooks/useBloques'
import { Button } from '@/components/ui/button'
import { StateDisplay } from '@/components/StateDisplay'
import { useLocation, useNavigate } from 'react-router-dom'
import { BackButton } from '@/components/BackButton'
import { useEffect, useState } from 'react'

interface Finca {
    id: number;
    nombre: string;
}

function Bloques() {
    const location = useLocation()
    const navigate = useNavigate()
    const [selectedAccion, setSelectedAccion] = useState<string | null>(null)

    const finca = location.state?.finca as Finca
    const accion = location.state?.accion as string

    const { bloques, getStateInfo } = useBloques(finca?.id)

    useEffect(() => {
        // Load selected accion from localStorage on component mount
        const storedAccion = localStorage.getItem('selectedAccion')
        if (storedAccion) {
            setSelectedAccion(storedAccion)
        }
    }, [])

    if (!finca) {
        navigate('/home')
        return null
    }
    const stateInfo = getStateInfo()
    if (stateInfo.shouldRender && stateInfo.stateProps) {
        return <StateDisplay {...stateInfo.stateProps} />
    }

    const handleBloqueSelect = (bloque: any) => {
        navigate('/variedades', {
            state: {
                finca,
                accion: accion || selectedAccion,
                bloque
            }
        })
    }

    return (
        <div className="flex flex-col p-4 gap-4 h-screen">
            <BackButton to="/acciones" state={{ finca }} />
            <div className='absolute flex flex-col gap-2 flex-grow justify-center items-center left-0 right-0'>
                <h1 className='text-2xl font-bold capitalize'>
                    {finca?.nombre}
                </h1>
                <span>
                    Selecciona un bloque
                </span>
                <Button className='bg-blue-600 text-white capitalize font-semibold w-screen rounded-none mt-2 text-lg'>
                    {accion.replace(/_/g, ' ') || selectedAccion?.replace(/_/g, ' ')}
                </Button>
            </div>
            <div className='flex flex-col flex-grow justify-center  w-full'>
                <div className="grid grid-cols-4 gap-2">
                    {bloques.map(bloque => (<Button
                        key={bloque.id}
                        className="w-full h-full capitalize aspect-square text-lg"
                        onClick={() => handleBloqueSelect(bloque)}
                    >
                        {bloque.nombre}
                    </Button>
                    ))}
                </div>
            </div>
        </div >
    )
}

export default Bloques
