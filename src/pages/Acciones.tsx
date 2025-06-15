import { useNavigate } from 'react-router-dom';
import { useSupabase } from '@/hooks/useSupabase';
import DataGridPage from '@/components/DataGridPage';

export default function Acciones() {
    const { fetchFincas } = useSupabase();
    const navigate = useNavigate();

    const handleFincaClick = (finca: any) => {
        navigate(`/bloques/${finca.id}`);
    }; return (
        <DataGridPage
            fetchData={fetchFincas}
            emptyMessage="No hay fincas disponibles"
            onItemClick={handleFincaClick}
            getItemTitle={(finca) => finca.nombre}
            getItemKey={(finca) => finca.id}
            showHeader={false}
            showGridToggle={false}
            defaultCols={2}
            storageKey="accionesGridLayout"
        />
    );
}
