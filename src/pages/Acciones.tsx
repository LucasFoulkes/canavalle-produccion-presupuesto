import { useAcciones } from '@/hooks/useAcciones'
import { Button } from '@/components/ui/button'
import { StateDisplay } from '@/components/StateDisplay'
import { ScrollArea } from "@/components/ui/scroll-area"
import { BackButton } from '@/components/BackButton'
import { useLocation, useNavigate } from 'react-router-dom'

interface Finca {
    id: number;
    nombre: string;
}

function Acciones() {
    const location = useLocation()
    const navigate = useNavigate()
    const { columns, getStateInfo } = useAcciones()

    const finca = location.state?.finca as Finca

    if (!finca) {
        navigate('/home')
        return null
    }

    const FILTERED_COLUMNS = ['id', 'created_at', 'updated_at', 'bloque_variedad_id']
    const filteredColumns = columns.filter(column => !FILTERED_COLUMNS.includes(column))

    const stateInfo = getStateInfo()
    if (stateInfo.shouldRender && stateInfo.stateProps) {
        return <StateDisplay {...stateInfo.stateProps} />
    } const handleAccionSelect = (accion: string) => {
        // Store selected accion in localStorage
        localStorage.setItem('selectedAccion', accion)
        console.log('Storing accion in localStorage:', accion)

        // Navigate to bloques with both finca and accion data
        navigate('/bloques', {
            state: {
                finca,
                accion
            }
        })
    }

    return (<div className="flex flex-col p-4 gap-4 h-screen">        <div className='flex flex-col gap-2 flex-grow justify-center items-center left-0 right-0'>
        <BackButton />
        <h1 className='text-2xl font-bold capitalize justify-center items-center flex'>
            {finca.nombre}
        </h1>
        <span>
            Selecciona una acción
        </span>
    </div>
        <div className='flex flex-col flex-grow justify-center overflow-hidden relative'>
            <ScrollArea className="h-full border-b-2 border-white">
                <div className="grid grid-cols-1 gap-3 pb-24">
                    {filteredColumns.map((column, index) => (
                        <Button
                            key={index}
                            className="w-full h-full capitalize h-20 text-lg"
                            onClick={() => handleAccionSelect(column)}
                        >
                            {column.replace(/_/g, ' ')}
                        </Button>
                    ))}
                </div>
            </ScrollArea>
            <div className="absolute bottom-0 left-0 right-0 h-24 bg-gradient-to-t from-white to-transparent pointer-events-none" />
        </div>
    </div>
    )
}

export default Acciones
