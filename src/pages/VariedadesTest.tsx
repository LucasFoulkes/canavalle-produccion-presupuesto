import { useParams } from 'react-router-dom'

function VariedadesTest() {
    const { fincaId, fincaNombre, accion, bloqueId } = useParams<{
        fincaId: string;
        fincaNombre: string;
        accion: string;
        bloqueId: string
    }>()

    console.log('🔍 VariedadesTest Debug:', { fincaId, fincaNombre, accion, bloqueId })

    return (
        <div className="flex flex-col h-full p-4">
            <h1>Variedades Test Page</h1>
            <p>Finca ID: {fincaId}</p>
            <p>Finca Name: {fincaNombre}</p>
            <p>Action: {accion}</p>
            <p>Bloque ID: {bloqueId}</p>
            <p>This is a simple test page to isolate the React.Children.only error.</p>
        </div>
    )
}

export default VariedadesTest
