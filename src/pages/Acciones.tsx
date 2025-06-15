import { useParams } from 'react-router-dom';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import DataGridPage from '@/components/DataGridPage';

const ACCIONES_ITEMS = [
    { id: 'produccion-real', nombre: 'PRODUCCION REAL' },
    { id: 'pinche-apertura', nombre: 'PINCHE DE APERTURA' },
    { id: 'pinche-sanitario', nombre: 'PINCHE SANITARIO' },
    { id: 'pinche-tierno', nombre: 'PINCHE EN TIERNO' },
    { id: 'porcentaje-ciegos', nombre: 'PORCENTAJE DE CIEGOS' },
    { id: 'clima', nombre: 'CLIMA' },
    { id: 'arveja', nombre: 'ARVEJA' },
    { id: 'garbanzo', nombre: 'GARBANZO' },
    { id: 'uva', nombre: 'UVA' }
];

export default function Acciones() {
    const { bloqueId } = useParams<{ bloqueId: string }>();
    const navigate = useNavigate();
    const { currentFinca, currentBloque } = useAuth();

    // Utility function to truncate location names
    const truncateLocation = (name: string, maxLength: number = 5) => {
        return name.length > maxLength ? name.substring(0, maxLength) : name;
    };

    // Get breadcrumb title showing the hierarchy
    const getTitle = () => {
        if (currentFinca && currentBloque) {
            const truncatedFinca = truncateLocation(currentFinca.nombre);
            const truncatedBloque = truncateLocation(currentBloque.nombre);
            return `${truncatedFinca} / ${truncatedBloque}`;
        }
        if (currentBloque) {
            return truncateLocation(currentBloque.nombre);
        }
        return 'Acciones';
    };

    const getBackPath = () => {
        if (currentFinca) {
            return `/bloques/${currentFinca.id}`;
        }
        return '/fincas';
    };

    // Mock fetch function that returns the static actions
    const fetchAcciones = () => {
        return Promise.resolve({ data: ACCIONES_ITEMS, error: null });
    }; const handleAccionClick = (_accion: any) => {
        // Navigate to variedades when an action is selected
        navigate(`/variedades/${bloqueId}`);
    };

    return (
        <DataGridPage
            fetchData={fetchAcciones}
            title={getTitle()}
            showBackButton={true}
            backPath={getBackPath()}
            emptyMessage="No hay acciones disponibles"
            onItemClick={handleAccionClick}
            getItemTitle={(accion) => accion.nombre}
            getItemKey={(accion) => accion.id}
            showHeader={true}
            showGridToggle={true}
            defaultCols={2}
            storageKey="accionesGridLayout"
        />
    );
}
