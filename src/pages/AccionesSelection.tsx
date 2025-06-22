import { useAcciones } from '@/hooks/useAcciones'
import { useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'

function AccionesSelection() {
    const navigate = useNavigate()
    const { columns } = useAcciones()

    const FILTERED_COLUMNS = ['id', 'created_at', 'updated_at', 'bloque_variedad_id']
    const filteredColumns = columns.filter(column => !FILTERED_COLUMNS.includes(column))

    const accionItems = filteredColumns.map((column, index) => ({
        id: index,
        nombre: column.replace(/_/g, ' ')
    }))

    const handleAccionSelect = (item: { id: number; nombre: string }) => {
        const originalColumn = filteredColumns[item.id]
        navigate(`/fincas/${originalColumn}`)
    }

    return (
        <div className="flex flex-col h-full">
            <header className='relative w-full h-fit flex justify-center mb-2'>
                <div className='text-center'>
                    <p className='text-gray-600'>
                        Selecciona una actividad
                    </p>
                </div>
            </header>
            <div className="flex-1 overflow-y-auto pb-20 mobile-scroll">
                <div className="flex flex-col gap-2 w-full max-w-md mx-auto">
                    {accionItems.map((item) => (
                        <Button className='w-full text-lg capitalize h-18'
                            onClick={() => handleAccionSelect(item)} key={item.id}>
                            {item.nombre}
                        </Button>
                    ))}
                </div>
            </div>
        </div>
    )
}

export default AccionesSelection
