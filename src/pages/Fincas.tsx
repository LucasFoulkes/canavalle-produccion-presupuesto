import { useFincas } from '@/hooks/useFincas'
import { StateDisplay } from '@/components/StateDisplay'
import { Button } from '@/components/ui/button'
import { useNavigate, useParams } from 'react-router-dom'
import { ActionBadge } from '@/components/ActionBadge'
import { BackButton } from '@/components/BackButton'

function Fincas() {
    const navigate = useNavigate()
    const { accion } = useParams<{ accion: string }>()
    const { fincas, getStateInfo } = useFincas()

    if (!accion) {
        navigate('/acciones')
        return null
    }

    const stateInfo = getStateInfo()

    if (stateInfo.shouldRender && stateInfo.stateProps) {
        return <StateDisplay {...stateInfo.stateProps} />
    } return (
        <>
            <header className='relative w-full h-fit flex justify-center mb-2'>
                <div className='text-center'>
                    <h1 className='text-2xl capitalize font-semibold'>
                        Fincas
                    </h1>
                    <p className='text-gray-600'>Selecciona una finca</p>
                </div>
                <BackButton to='/acciones' />
            </header>
            <ActionBadge action={accion} />
            <div className='flex-1 flex items-center justify-center'>
                <div className='grid grid-cols-2 gap-3 w-full'>
                    {fincas.map((finca) => (
                        <Button
                            key={finca.id}
                            className='aspect-square h-full text-xl capitalize'
                            onClick={() => {
                                const urlSafeName = finca.nombre.toLowerCase().replace(/\s+/g, '-')
                                navigate(`/acciones/${finca.id}/${urlSafeName}`)
                            }}
                        >
                            {finca.nombre}
                        </Button>
                    ))}
                </div>
            </div>
        </>
    )
}

export default Fincas
