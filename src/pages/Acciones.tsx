import { useAcciones } from '@/hooks/useAcciones'
import { useParams, useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { BackButton } from '@/components/BackButton'

function Acciones() {
    const navigate = useNavigate()
    const { fincaId, fincaNombre } = useParams<{ fincaId: string; fincaNombre: string }>()
    const { columns } = useAcciones()

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
                <BackButton to='/fincas' />            </header>
            <div className="flex-1 overflow-y-auto pb-20">
                <div className="flex flex-col gap-2 w-full max-w-md mx-auto">
                    {accionItems.map((item) => (
                        <Button className='w-full text-lg capitalize h-18'
                            onClick={() => handleAccionSelect(item)} key={item.id}>
                            {item.nombre}
                        </Button>
                    ))}
                </div>
            </div>
        </>
    )
}

export default Acciones
