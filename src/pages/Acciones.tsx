import { useAcciones } from '@/hooks/useAcciones'
import { StateDisplay } from '@/components/StateDisplay'
import { useParams, useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { BackButton } from '@/components/BackButton'

function Acciones() {
    const navigate = useNavigate()
    const { fincaId, fincaNombre } = useParams<{ fincaId: string; fincaNombre: string }>()
    const { columns, getStateInfo } = useAcciones()

    if (!fincaId || !fincaNombre) {
        navigate('/fincas')
        return null
    }

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
        navigate(`/bloques/${fincaId}/${fincaNombre}/${originalColumn}`)
    }

    return (
        <>
            <header className='relative w-full h-fit flex justify-center mb-2'>
                <div className='text-center'>
                    <h1 className='text-2xl capitalize font-semibold'>
                        {fincaNombre.replace(/-/g, ' ')}
                    </h1>
                    <p className='text-gray-600'>
                        Selecciona una acción
                    </p>
                </div>
                <BackButton to='/fincas' />            </header >
            <div className="flex-1 flex items-center justify-center w-full overflow-y-auto pb-8">
                <div className="flex flex-col gap-2 w-full max-w-md">
                    {accionItems.map((item) => (
                        <Button className='w-full text-lg capitalize h-18'
                            onClick={() => handleAccionSelect(item)} key={item.id}>
                            {item.nombre}
                        </Button>
                    ))}
                </div>
            </div >
            <span
                className="absolute bottom-0 left-0 right-0 h-12 bg-gradient-to-b from-transparent to-white"
            ></span>
        </>
    )
}

export default Acciones
