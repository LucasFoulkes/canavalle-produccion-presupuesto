import { useVariedades } from '@/hooks/useVariedades'
import { Button } from '@/components/ui/button'
import { StateDisplay } from '@/components/StateDisplay'
import { useLocation, useParams } from 'react-router-dom'
import { BackButton } from '@/components/BackButton'

function Variedades() {
    const { state } = useLocation() as { state: { bloque: { id: number; nombre: string }; finca: { id: number; nombre: string } } }
    const bloque = state?.bloque
    const finca = state?.finca

    const { bloqueId } = useParams<{ bloqueId: string }>()
    const id = bloqueId ? parseInt(bloqueId, 10) : undefined

    const { variedades, getStateInfo } = useVariedades(id)
    const stateInfo = getStateInfo()
    if (stateInfo.shouldRender && stateInfo.stateProps) {
        return <StateDisplay {...stateInfo.stateProps} />
    } return (<div className="flex flex-col p-4 gap-4 h-screen">
        <BackButton to="/bloques" state={{ finca }} />        <div className='absolute flex flex-col gap-2 flex-grow justify-center items-center left-0 right-0'>
            <h1 className='text-2xl font-bold capitalize'>
                {finca?.nombre && bloque?.nombre
                    ? `${finca.nombre} - ${bloque.nombre}`
                    : bloque?.nombre || 'Variedades'}
            </h1>
            <span>Selecciona una variedad</span>
        </div>
        <div className='flex flex-col flex-grow justify-center w-full'>
            <div className="grid grid-cols-1 gap-3">
                {variedades.map(variedad => (
                    <Button
                        key={variedad.id}
                        className="w-full h-full capitalize h-20 text-lg"
                        onClick={() => alert(`Variedad seleccionada: ${variedad.nombre}`)}>
                        {variedad.nombre}
                    </Button>
                ))}
            </div>
        </div>
    </div>
    )
}

export default Variedades
