import { useState, useEffect, useCallback } from 'react';

interface UseDataGridProps {
    fetchData: () => Promise<{ data: any[] | null; error: any }>;
}

export function useDataGrid({ fetchData }: UseDataGridProps) {
    const [data, setData] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const loadData = useCallback(async () => {
        try {
            setLoading(true);
            setError(null);
            const result = await fetchData();

            if (result.error) {
                setError(result.error.message || 'Error desconocido');
            } else {
                setData(result.data || []);
            }
        } catch (err) {
            setError('Error inesperado al cargar los datos');
        } finally {
            setLoading(false);
        }
    }, [fetchData]);

    useEffect(() => {
        loadData();
    }, [loadData]);

    return {
        data,
        loading,
        error,
        refetch: loadData
    };
}
