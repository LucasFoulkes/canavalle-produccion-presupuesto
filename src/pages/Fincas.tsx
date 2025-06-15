import { useNavigate } from 'react-router-dom';
import { useSupabase } from '@/hooks/useSupabase';
import DataGridPage from '@/components/DataGridPage';

export default function Fincas() {
    const { fetchFincas } = useSupabase();
    const navigate = useNavigate();

    const handleFincaClick = (finca: any) => {
        navigate(`/bloques/${finca.id}`);
    };

    return (
        <DataGridPage
            fetchData={fetchFincas}
            title="Fincas"
            emptyMessage="No hay fincas disponibles"
            onItemClick={handleFincaClick}
            getItemTitle={(finca) => finca.nombre}
            getItemKey={(finca) => finca.id}
            showHeader={false}
            showBackButton={false}
            showGridToggle={false}
            defaultCols={2}
            storageKey="fincasGridLayout"
        />
    );
}
