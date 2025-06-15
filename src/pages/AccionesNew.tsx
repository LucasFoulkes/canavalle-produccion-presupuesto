import { useNavigate } from 'react-router-dom';
import { useSupabase } from '@/hooks/useSupabase';
import DataGridPage from '@/components/DataGridPage';

interface Finca {
    id: string;
    nombre: string;
    ubicacion?: string;
    hectareas?: number;
    created_at?: string;
}

export default function Acciones() {
    const { fetchFincas } = useSupabase();
    const navigate = useNavigate();

    return (
        <DataGridPage
            fetchData={fetchFincas}
            emptyMessage="No hay fincas disponibles"
            onItemClick={(finca: Finca) => navigate(`/bloques/${finca.id}`)}
            getItemTitle={(finca: Finca) => finca.nombre}
            getItemKey={(finca: Finca) => finca.id}
        />
    );
}
