import { useFincas } from '@/hooks/useFincas'
import { Button } from '@/components/ui/button'
import { StateDisplay } from '@/components/StateDisplay'
import { useNavigate } from 'react-router-dom'

function Home() {
    const { fincas, getStateInfo } = useFincas()
    const navigate = useNavigate()

    const stateInfo = getStateInfo()
    if (stateInfo.shouldRender && stateInfo.stateProps) {
        return <StateDisplay {...stateInfo.stateProps} />
    }

    return (
        <div className="flex flex-col p-4 gap-4 h-screen">
            <h1 className='absolute flex flex-grow justify-center items-center left-0 right-0'>
                Selecciona una finca
            </h1>
            <div className='flex flex-col flex-grow justify-center  w-full'>
                <div className="grid grid-cols-2 gap-3">
                    {fincas.map(finca => (
                        <Button
                            key={finca.id}
                            className="w-full h-full capitalize aspect-square text-lg"
                            onClick={() => navigate(`/acciones`, { state: { finca: finca } })}
                        >
                            {finca.nombre}
                        </Button>
                    ))}
                </div>
            </div>
        </div>
    )
}

export default Home
