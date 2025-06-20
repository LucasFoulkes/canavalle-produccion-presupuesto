import { useAcciones } from '@/hooks/useAcciones'
import { StateDisplay } from '@/components/StateDisplay'
import { BackButton } from '@/components/BackButton'
import PageLayout from '@/components/PageLayout'
import { useLocation, useNavigate } from 'react-router-dom'

function Acciones() {
    const navigate = useNavigate()
    const { columns, getStateInfo } = useAcciones()
    const finca = useLocation().state?.finca

    const FILTERED_COLUMNS = ['id', 'created_at', 'updated_at', 'bloque_variedad_id']
    const filteredColumns = columns.filter(column => !FILTERED_COLUMNS.includes(column))

    const accionItems = filteredColumns.map((column, index) => ({
        id: index,
        nombre: column.replace(/_/g, ' ')
    }))

    const stateInfo = getStateInfo()
    if (stateInfo.shouldRender && stateInfo.stateProps) {
        return <StateDisplay {...stateInfo.stateProps} />
    }
    const handleAccionSelect = (item: { id: number; nombre: string }) => {
        const originalColumn = filteredColumns[item.id]
        navigate('/bloques', { state: { finca, accion: originalColumn } })
    }

    return (<>
        <BackButton to="/home" />
        <div className="absolute left-0 right-0 bottom-0 h-28 z-10 bg-gradient-to-t from-white via-white/0 to-transparent" />

        <PageLayout
            items={accionItems}
            title="acción"
            onItemSelect={handleAccionSelect}
            columns={1}
            mainTitle={finca.nombre}
            absoluteHeader={false}
        />
    </>
    )
}

export default Acciones
