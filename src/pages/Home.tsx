import { useFincas } from '@/hooks/useFincas'
import { StateDisplay } from '@/components/StateDisplay'
import PageLayout from '@/components/PageLayout'
import { useNavigate } from 'react-router-dom'

function Home() {
    const { fincas, getStateInfo } = useFincas()
    const navigate = useNavigate()

    const stateInfo = getStateInfo()
    if (stateInfo.shouldRender && stateInfo.stateProps) {
        return <StateDisplay {...stateInfo.stateProps} />
    } return (
        <PageLayout
            items={fincas}
            title="finca"
            onItemSelect={(finca) => navigate(`/acciones`, { state: { finca } })}
            columns={2}
        />
    )
}

export default Home
