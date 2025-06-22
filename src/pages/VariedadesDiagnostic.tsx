import { useParams, useNavigate } from 'react-router-dom'

function VariedadesDiagnostic() {
    const navigate = useNavigate()
    const { fincaId, fincaNombre, accion, bloqueId } = useParams<{
        fincaId: string;
        fincaNombre: string;
        accion: string;
        bloqueId: string
    }>()

    console.log('🔧 DIAGNOSTIC: Variedades page accessed with:', {
        fincaId, fincaNombre, accion, bloqueId
    })

    if (!fincaId || !fincaNombre || !bloqueId || !accion) {
        console.log('🔧 DIAGNOSTIC: Missing params, redirecting')
        navigate('/fincas')
        return null
    }

    return (
        <div style={{ padding: '20px', fontFamily: 'Arial, sans-serif' }}>
            <h1>🔧 DIAGNOSTIC MODE</h1>
            <div style={{ marginBottom: '10px' }}>
                <strong>Route params:</strong>
                <ul>
                    <li>Finca ID: {fincaId}</li>
                    <li>Finca Name: {fincaNombre}</li>
                    <li>Action: {accion}</li>
                    <li>Bloque ID: {bloqueId}</li>
                </ul>
            </div>
            <p>✅ No Radix UI components, pure HTML/CSS only</p>
            <p>If this works without error, the issue is with Radix UI components</p>
            <button
                onClick={() => navigate(-1)}
                style={{
                    padding: '10px 20px',
                    backgroundColor: '#007bff',
                    color: 'white',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: 'pointer'
                }}
            >
                ← Go Back
            </button>
        </div>
    )
}

export default VariedadesDiagnostic
