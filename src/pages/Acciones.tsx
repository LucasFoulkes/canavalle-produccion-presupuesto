import { useAcciones } from '@/hooks/useAcciones'
import { StateDisplay } from '@/components/StateDisplay'
import { useParams, useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { CircleChevronLeft } from 'lucide-react'

function Acciones() {
    const navigate = useNavigate()
    const { fincaId, fincaNombre } = useParams<{ fincaId: string; fincaNombre: string }>()
    const { columns, getStateInfo } = useAcciones()

    // Redirect if missing required params
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
            <div className='w-full left-0 right-0 h-fit flex justify-center pb-4'>
                <div className='text-left w-full'>
                    <h1 className='text-2xl capitalize font-semibold'>
                        {fincaNombre.replace(/-/g, ' ')}
                    </h1>
                    <p className='text-gray-600'>
                        Selecciona una acción
                    </p>
                </div>
                <div className='right-4 top-0 bottom-0 flex'>
                    <CircleChevronLeft className='h-full w-full stroke-1 opacity-10' />
                </div>
            </div >
            <div className='flex flex-col h-full gap-4 w-full overflow-y-auto pb-12'>
                {/* <div className='flex flex-col items-center justify-center h-full gap-4 w-full overflow-hidden '> */}
                {
                    accionItems.map((item) => (
                        <Button className='w-full text-lg capitalize h-18'
                            onClick={() => handleAccionSelect(item)} key={item.id}>
                            {item.nombre}
                        </Button>
                    ))
                }
            </div >
            <span
                className="absolute bottom-0 left-0 right-0 h-12 bg-gradient-to-b from-transparent to-white"
            ></span>
        </>
    )
}

export default Acciones
