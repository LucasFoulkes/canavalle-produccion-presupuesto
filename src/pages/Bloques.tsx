import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { useSupabase } from '@/hooks/useSupabase';
import DataGridPage from '@/components/DataGridPage';

export default function Bloques() {
    const { fincaId } = useParams<{ fincaId: string }>();
    const { fetchBloquesByFincaId, fetchFincaById } = useSupabase();
    const [fincaName, setFincaName] = useState<string>('');

    useEffect(() => {
        if (fincaId) {
            fetchFincaById(fincaId).then(({ data }) => {
                setFincaName(data?.nombre || 'Finca');
            });
        }
    }, [fincaId, fetchFincaById]);

    const fetchBloques = () => {
        if (!fincaId) return Promise.resolve({ data: [], error: null });
        return fetchBloquesByFincaId(fincaId);
    };

    const handleBloqueClick = (bloque: any) => {
        // TODO: Navigate to bloque details
        console.log('Clicked bloque:', bloque.id);
    };

    return (
        <DataGridPage
            fetchData={fetchBloques}
            title={fincaName}
            showBackButton={true}
            backPath="/acciones"
            emptyMessage="No hay bloques disponibles para esta finca"
            onItemClick={handleBloqueClick}
            getItemTitle={(bloque) => bloque.nombre}
            getItemKey={(bloque) => bloque.id}
        />
    );
}
