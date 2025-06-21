import { useFincas } from '@/hooks/useFincas'
import { StateDisplay } from '@/components/StateDisplay'
import { Button } from '@/components/ui/button'
import { useNavigate } from 'react-router-dom'

function Fincas() {
    const navigate = useNavigate()
    const { fincas, getStateInfo } = useFincas()
    const stateInfo = getStateInfo()

    if (stateInfo.shouldRender && stateInfo.stateProps) {
        return <StateDisplay {...stateInfo.stateProps} />
    }

    return (
        <>
            <p className='absolute w-full left-0 right-0'>Selecciona una finca</p>
            <div className='flex-1 flex items-center justify-center'>
                <div className='grid grid-cols-2 gap-3 w-full'>
                    {fincas.map((finca) => (<Button
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
