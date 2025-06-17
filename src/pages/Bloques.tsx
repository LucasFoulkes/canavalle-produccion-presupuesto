import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useSupabase } from '@/hooks/useSupabase';
import { useAuth } from '@/contexts/AuthContext';
import DataGridPage from '@/components/DataGridPage';

export default function Bloques() {
    const { fincaId } = useParams<{ fincaId: string }>();
    const navigate = useNavigate();

    const { fetchBloquesByFincaId, fetchFincaById } = useSupabase();
    const { currentFinca, setCurrentFinca, setCurrentBloque } = useAuth();
    const [fincaName, setFincaName] = useState<string>('');

    useEffect(() => {
        if (fincaId) {
            // Check if we already have the finca in context
            if (currentFinca && currentFinca.id === fincaId) {
                setFincaName(currentFinca.nombre);
            } else {
                // Fetch and store in context
                fetchFincaById(fincaId).then(({ data }) => {
                    if (data) {
                        setCurrentFinca(data);
                        setFincaName(data.nombre);
                    }
                });
            }
        }
    }, [fincaId, fetchFincaById, currentFinca, setCurrentFinca]);

    const fetchBloques = useCallback(() => {
        if (!fincaId) return Promise.resolve({ data: [], error: null });
        return fetchBloquesByFincaId(fincaId);
    }, [fincaId, fetchBloquesByFincaId]);

    const handleBloqueClick = (bloque: any) => {
        // Store the clicked bloque in context
        setCurrentBloque(bloque);
        navigate(`/acciones/${bloque.id}`);
    };

    return (<div className="min-h-screen">
        <DataGridPage
            fetchData={fetchBloques}
            title={fincaName ? `${fincaName} - Bloques` : 'Finca - Bloques'}
            showBackButton={true}
            backPath="/fincas"
            emptyMessage="No hay bloques disponibles para esta finca"
            onItemClick={handleBloqueClick}
            getItemTitle={(bloque) => bloque.nombre}
            getItemKey={(bloque) => bloque.id}
            showHeader={true}
            showGridToggle={false}
            defaultCols={4}
            storageKey="bloquesGridLayout"
        />
    </div>
    );
}
