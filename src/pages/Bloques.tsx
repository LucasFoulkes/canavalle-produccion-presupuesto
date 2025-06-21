import { useBloques } from '@/hooks/useBloques'
import { StateDisplay } from '@/components/StateDisplay'
import { useParams, useNavigate } from 'react-router-dom'
import { BackButton } from '@/components/BackButton'
import { Button } from '@/components/ui/button'
import { ActionBadge } from '@/components/ActionBadge'

function Bloques() {
    const navigate = useNavigate()
    const { fincaId, fincaNombre, accion } = useParams<{
        fincaId: string;
        fincaNombre: string;
        accion: string
    }>()

    const { bloques, getStateInfo } = useBloques(fincaId ? parseInt(fincaId) : undefined)

    // Redirect if missing required params
    if (!fincaId || !fincaNombre || !accion) {
        navigate('/fincas')
        return null
    }

    const stateInfo = getStateInfo()
    if (stateInfo.shouldRender && stateInfo.stateProps) {
        return <StateDisplay {...stateInfo.stateProps} />
    }

    const handleBloqueSelect = (bloque: any) => {
        navigate(`/variedades/${fincaId}/${fincaNombre}/${accion}/${bloque.id}`)
    }

    return (
        <>
            <div className='absolute w-full left-0 right-0 h-fit flex justify-center'>
                <div className='text-center'>
                    <h1 className='text-2xl capitalize font-semibold'>
                        {fincaNombre.replace(/-/g, ' ')}
                    </h1>
                    <p className='text-gray-600'>Selectiona un bloque</p>
                    <ActionBadge action={accion} />
                </div>
                <BackButton to={`/acciones/${fincaId}/${fincaNombre}`} />
            </div>
            <div className='flex-1 flex flex-col gap-4 items-center justify-center w-full h-full'>
                <div className='grid grid-cols-4 gap-2 w-full'>
                    {bloques.map((bloque) => (
                        <Button
                            key={bloque.id}
                            className=' aspect-square h-full text-xl capitalize'
                            onClick={() => handleBloqueSelect(bloque)}
                        >
                            {bloque.nombre}
                        </Button>
                    ))}
                </div>
            </div>
        </>
    )
}

export default Bloques
