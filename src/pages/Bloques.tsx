import { useBloques } from '@/hooks/useBloques'
import { Button } from '@/components/ui/button'
import { StateDisplay } from '@/components/StateDisplay'
import { useLocation, useNavigate } from 'react-router-dom'
import { BackButton } from '@/components/BackButton'

function Bloques() {
    const { state } = useLocation() as { state: { finca: { id: number, nombre: string } } }
    const finca = state?.finca
    const { bloques, getStateInfo } = useBloques(finca.id)
    const navigate = useNavigate()

    const stateInfo = getStateInfo()
    if (stateInfo.shouldRender && stateInfo.stateProps) {
        return <StateDisplay {...stateInfo.stateProps} />
    } return (
        <div className="flex flex-col p-4 gap-4 h-screen">
            <BackButton to="/home" />
            <div className='absolute flex flex-col gap-2 flex-grow justify-center items-center left-0 right-0'>
                <h1 className='text-2xl font-bold capitalize'>
                    {finca?.nombre}
                </h1>
                <span>
                    Selecciona un bloque
                </span>
            </div>
            <div className='flex flex-col flex-grow justify-center  w-full'>
                <div className="grid grid-cols-4 gap-2">
                    {bloques.map(bloque => (<Button
                        key={bloque.id}
                        className="w-full h-full capitalize aspect-square text-lg"
                        onClick={() => navigate(`/variedades/${bloque.id}`, { state: { bloque, finca } })}
                    >
                        {bloque.nombre}
                    </Button>
                    ))}
                </div>
            </div>
        </div>
    )
}

export default Bloques
