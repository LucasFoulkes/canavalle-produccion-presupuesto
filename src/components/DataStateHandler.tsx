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
    const centerDiv = (content: React.ReactNode) => (
        <div className="flex items-center justify-center min-h-[200px]">
            {content}
        </div>
    ); if (loading) {
        return centerDiv(
            <div className="text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-2"></div>
                <p className="text-muted-foreground">Cargando...</p>
            </div>
        );
    }

    if (error) {
        return centerDiv(
            <div className="text-center">
                <p className="text-destructive mb-2">Error al cargar los datos</p>
                <p className="text-sm text-muted-foreground">{error}</p>
            </div>
        );
    }

    if (!data?.length) {
        return centerDiv(<p className="text-muted-foreground">{emptyMessage}</p>);
    }

    return <>{children}</>;
}
