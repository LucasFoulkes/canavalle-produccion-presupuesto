import { useBloques } from '@/hooks/useBloques'
import { StateDisplay } from '@/components/StateDisplay'
import { ActionButton } from '@/components/ActionButton'
import { BackButton } from '@/components/BackButton'
import PageLayout from '@/components/PageLayout'
import { useLocation, useNavigate } from 'react-router-dom'

function Bloques() {
    const location = useLocation()
    const navigate = useNavigate()

    const finca = location.state?.finca
    const accion = location.state?.accion

    const { bloques, getStateInfo } = useBloques(finca?.id)

    const stateInfo = getStateInfo()
    if (stateInfo.shouldRender && stateInfo.stateProps) {
        return <StateDisplay {...stateInfo.stateProps} />
    }
    const handleBloqueSelect = (bloque: any) => {
        navigate('/variedades', {
            state: {
                finca,
                accion,
                bloque
            }
        })
    }

    return (
        <>
            <BackButton to="/acciones" state={{ finca }} />
            <PageLayout
                items={bloques}
                title="bloque"
                onItemSelect={handleBloqueSelect}
                columns={4}
                mainTitle={finca.nombre}
                actionComponent={<ActionButton action={accion} />}
            />
        </>
    )
}

export default Bloques
