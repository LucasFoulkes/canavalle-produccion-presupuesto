import React from 'react';

interface DataStateHandlerProps {
    loading: boolean;
    error: string | null;
    data: any[] | null;
    emptyMessage?: string;
    children: React.ReactNode;
}

export default function DataStateHandler({
    loading,
    error,
    data,
    emptyMessage = "No hay datos disponibles",
    children
}: DataStateHandlerProps) {
    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[200px]">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto mb-2"></div>
                    <p className="text-gray-600">Cargando...</p>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="flex items-center justify-center min-h-[200px]">
                <div className="text-center">
                    <p className="text-red-500 mb-2">Error al cargar los datos</p>
                    <p className="text-sm text-gray-600">{error}</p>
                </div>
            </div>
        );
    }

    if (!data || data.length === 0) {
        return (
            <div className="flex items-center justify-center min-h-[200px]">
                <p className="text-gray-600">{emptyMessage}</p>
            </div>
        );
    }

    return <>{children}</>;
}
