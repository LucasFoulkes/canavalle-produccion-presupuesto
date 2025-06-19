import { useVariedades } from '@/hooks/useVariedades'
import { Button } from '@/components/ui/button'
import { StateDisplay } from '@/components/StateDisplay'
import { VariedadAmountDialog } from '@/components/VariedadAmountDialog'
import { useLocation, useNavigate } from 'react-router-dom'
import { BackButton } from '@/components/BackButton'
import { useEffect, useState } from 'react'

interface Finca {
    id: number;
    nombre: string;
}

interface Bloque {
    id: number;
    nombre: string;
    finca_id: number;
}

interface Variedad {
    id: number;
    nombre: string;
}

function Variedades() {
    const location = useLocation()
    const navigate = useNavigate()
    const [selectedAccion, setSelectedAccion] = useState<string | null>(null)
    const [dialogOpen, setDialogOpen] = useState(false)
    const [selectedVariedad, setSelectedVariedad] = useState<Variedad | null>(null)

    const finca = location.state?.finca as Finca
    const accion = location.state?.accion as string
    const bloque = location.state?.bloque as Bloque

    const { variedades, getStateInfo } = useVariedades(bloque?.id)

    useEffect(() => {
        // Load selected accion from localStorage on component mount
        const storedAccion = localStorage.getItem('selectedAccion')
        if (storedAccion) {
            setSelectedAccion(storedAccion)
        }
    }, [])

    if (!finca || !bloque) {
        navigate('/home')
        return null
    } const stateInfo = getStateInfo()
    if (stateInfo.shouldRender && stateInfo.stateProps) {
        return <StateDisplay {...stateInfo.stateProps} />
    } const handleVariedadSelect = (variedad: Variedad) => {
        setSelectedVariedad(variedad)
        setDialogOpen(true)
    }

    const handleDialogConfirm = (data: {
        finca: string;
        bloque: string;
        variedad: string;
        accion: string;
        amount: number;
    }) => {
        setSelectedVariedad(null)
    }

    return (<div className="flex flex-col p-4 gap-4 h-screen">
        <BackButton to="/bloques" state={{ finca, accion: accion || selectedAccion }} />        <div className='absolute flex flex-col gap-2 flex-grow justify-center items-center left-0 right-0'>
            <h1 className='text-2xl font-bold capitalize'>
                {finca?.nombre && bloque?.nombre
                    ? `${finca.nombre} • ${bloque.nombre}`
                    : bloque?.nombre || 'Variedades'}
            </h1>
            <span>Selecciona una variedad</span>
            <Button className='bg-blue-600 text-white uppercase font-semibold w-screen rounded-none mt-2 text-lg'>
                {accion.replace(/_/g, ' ') || selectedAccion?.replace(/_/g, ' ')}
            </Button>
        </div>
        <div className='flex flex-col flex-grow justify-center w-full'>
            <div className="grid grid-cols-1 gap-3">
                {variedades.map(variedad => (
                    <Button
                        key={variedad.id} className="w-full h-full capitalize h-20 text-lg"
                        onClick={() => handleVariedadSelect(variedad)}>
                        {variedad.nombre}
                    </Button>
                ))}
            </div>
        </div>

        <VariedadAmountDialog
            open={dialogOpen}
            onOpenChange={setDialogOpen}
            finca={finca}
            bloque={bloque}
            variedad={selectedVariedad}
            accion={accion || selectedAccion || ''}
            onConfirm={handleDialogConfirm}
        />
    </div>
    )
}

export default Variedades
