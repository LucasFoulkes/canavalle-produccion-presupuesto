import { useNavigate } from 'react-router-dom';
import { useSupabase } from '@/hooks/useSupabase';
import DataGridPage from '@/components/DataGridPage';

export default function Fincas() {
    const { fetchFincas } = useSupabase();
    const navigate = useNavigate();

    const handleFincaClick = (finca: any) => {
        navigate(`/bloques/${finca.id}`);
    }; return (<div className="h-full">
        {/* Custom header for Fincas page */}
        <div className="mb-6">
            <div className="flex items-center justify-center">
                <h1 className="text-2xl font-bold text-professional-primary bauhaus-title text-center">
                    Cananvalle - Fincas
                </h1>
            </div>
        </div>

        <DataGridPage
            fetchData={fetchFincas}
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
    </div>
    );
}
