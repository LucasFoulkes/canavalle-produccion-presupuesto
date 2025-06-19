import { useVariedades } from '@/hooks/useVariedades'
import { Button } from '@/components/ui/button'
import { StateDisplay } from '@/components/StateDisplay'
import { VariedadAmountDialog } from '@/components/VariedadAmountDialog'
import { ActionButton } from '@/components/ActionButton'
import { BackButton } from '@/components/BackButton'
import { useLocation, useNavigate } from 'react-router-dom'

function Variedades() {
    const location = useLocation()
    const navigate = useNavigate()

    const finca = location.state?.finca
    const accion = location.state?.accion
    const bloque = location.state?.bloque

    const { variedades, getStateInfo } = useVariedades(bloque?.id)

    if (!finca || !bloque) {
        navigate('/home')
        return null
    }

    const stateInfo = getStateInfo()
    if (stateInfo.shouldRender && stateInfo.stateProps) {
        return <StateDisplay {...stateInfo.stateProps} />
    } return (
        <div className="flex flex-col p-4 gap-4 h-screen">
            <BackButton to="/bloques" state={{ finca, accion }} />
            <header className='flex flex-col gap-2 justify-center items-center absolute top-4 left-0 right-0'>
                <h1 className='text-2xl font-bold capitalize'>
                    {finca.nombre} • {bloque.nombre}
                </h1>
                <span>Selecciona una variedad</span>
                <ActionButton action={accion} />
            </header>
            <div className="flex-1 flex items-center justify-center">
                <div className="grid gap-3 w-full grid-cols-1">
                    {variedades.map(variedad => (
                        <VariedadAmountDialog
                            key={variedad.id}
                            finca={finca}
                            bloque={bloque}
                            variedad={variedad}
                            accion={accion || ''}
                        >
                            <Button className="w-full capitalize h-20 text-lg">
                                {variedad.nombre}
                            </Button>
                        </VariedadAmountDialog>
                    ))}
                </div>
            </div>
        </div>
    )
}

export default Variedades
