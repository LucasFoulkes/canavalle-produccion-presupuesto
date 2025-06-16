import { useSupabase } from '@/hooks/useSupabase';
import { createPage } from '@/lib/pageFactory';
import { BaseItem } from '@/lib/schema';

export default function Fincas() {
    const { fetchFincas } = useSupabase();

    const PageComponent = createPage<BaseItem>({
        fetchData: fetchFincas,
        getTitle: () => 'Fincas',
        getNextPath: (finca) => `/bloques/${finca.id}`,
        getItemTitle: (finca) => finca.nombre,
        getItemKey: (finca) => finca.id,
        showHeader: false,
        showBackButton: false,
        showGridToggle: false,
        defaultCols: 2,
        emptyMessage: "No hay fincas disponibles",
        storageKey: "fincasGridLayout"
    });

    return <PageComponent />;
}
