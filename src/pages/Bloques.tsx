import { useBloques } from '@/hooks/useBloques'
import { StateDisplay } from '@/components/StateDisplay'
import { useParams, useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { ActionBadge } from '@/components/ActionBadge'
import { BackButton } from '@/components/BackButton'

function Bloques() {
    const navigate = useNavigate()
    const { fincaId, fincaNombre, accion } = useParams<{
        fincaId: string;
        fincaNombre: string;
        accion: string
    }>()

    const { bloques, getStateInfo } = useBloques(fincaId ? parseInt(fincaId) : undefined)

    if (!fincaId || !fincaNombre || !accion) {
        navigate('/fincas')
        return null
    } const stateInfo = getStateInfo()
    if (stateInfo.shouldRender && stateInfo.stateProps) {
        return <StateDisplay {...stateInfo.stateProps} />
    }

    const handleBloqueSelect = (bloque: any) => {
        navigate(`/variedades/${fincaId}/${fincaNombre}/${accion}/${bloque.id}`)
    }

    return (
        <>
            <header className='relative w-full h-fit flex justify-center mb-2'>
                <div className='text-center'>
                    <h1 className='text-2xl capitalize font-semibold'>
                        {fincaNombre.replace(/-/g, ' ')}
                    </h1>
                    <p className='text-gray-600'>Selectiona un bloque</p>
                </div>
                <BackButton to={`/acciones/${fincaId}/${fincaNombre}`} />
            </header>
            <ActionBadge action={accion} />
            <div className="flex flex-col h-full gap-2 w-full overflow-y-auto pb-8 mt-2">
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
