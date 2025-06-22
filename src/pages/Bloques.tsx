import { useBloques } from '@/hooks/useBloques'
import { StateDisplay } from '@/components/StateDisplay'
import { useParams, useNavigate } from 'react-router-dom'
// import { Button } from '@/components/ui/button'
// import { ActionBadge } from '@/components/ActionBadge'
import { BackButton } from '@/components/BackButton'
import { useState } from 'react'
// working
function Bloques() {
    const navigate = useNavigate()
    const [isNavigating, setIsNavigating] = useState(false)

    const { fincaId, fincaNombre, accion } = useParams<{
        fincaId: string;
        fincaNombre: string;
        accion: string
    }>()

    const { bloques: allBloques, getStateInfo } = useBloques()

    // Filter bloques by fincaId
    const bloques = allBloques.filter(bloque =>
        bloque.finca_id === (fincaId ? parseInt(fincaId) : 0)
    )

    // Debug logging
    console.log('🔍 Bloques Debug:')
    console.log('fincaId from URL:', fincaId)
    console.log('fincaId parsed:', fincaId ? parseInt(fincaId) : 0)
    console.log('All bloques:', allBloques)
    console.log('Filtered bloques:', bloques)
    console.log('All bloque finca_ids:', allBloques.map(b => b.finca_id))

    if (!fincaId || !fincaNombre || !accion) {
        navigate('/fincas')
        return null
    }

    const stateInfo = getStateInfo()

    const handleBloqueSelect = (bloque: any) => {
        // Prevent multiple rapid clicks
        if (isNavigating) {
            console.log('⚠️ Already navigating, ignoring click')
            return
        }

        console.log('🔄 Bloque selected:', bloque)
        console.log('📍 Navigating to:', `/variedades/${fincaId}/${fincaNombre}/${accion}/${bloque.id}`)

        setIsNavigating(true)

        // Add a small delay to ensure the click event has finished processing
        setTimeout(() => {
            navigate(`/variedades/${fincaId}/${fincaNombre}/${accion}/${bloque.id}`)
        }, 10)
    }

    return (
        <div className="flex flex-col h-full">
            <header className='relative w-full h-fit flex justify-center mb-2'>
                <div className='text-center'>
                    <h1 className='text-2xl capitalize font-semibold'>
                        {fincaNombre.replace(/-/g, ' ')}
                    </h1>
                    <p className='text-gray-600'>Selecciona un bloque</p>
                </div>
                <BackButton to={`/fincas/${accion}`} />
            </header>
            {/* <ActionBadge action={accion} /> */}
            <div className="w-full flex justify-center items-center top-0">
                <span className="inline-flex items-center justify-center rounded-md border px-2 py-0.5 text-xs font-medium bg-primary text-primary-foreground capitalize">
                    {accion?.replace(/_/g, ' ')}
                </span>
            </div>
            {stateInfo.shouldRender && stateInfo.stateProps ? (
                <div className="flex-1 flex items-center justify-center">
                    <StateDisplay {...stateInfo.stateProps} />
                </div>) : (
                <div className="flex-1 overflow-y-auto pb-20 mt-2 mobile-scroll">
                    <div className='grid grid-cols-4 gap-2 w-full'>                        {bloques.map((bloque) => (
                        <button
                            key={bloque.id}
                            className='aspect-square w-full h-full text-xl capitalize bg-primary text-primary-foreground rounded-md hover:bg-primary/90'
                            onClick={() => handleBloqueSelect(bloque)}
                        >
                            {bloque.nombre}
                        </button>
                    ))}
                    </div>
                </div>
            )}
        </div>
    )
}

export default Bloques
