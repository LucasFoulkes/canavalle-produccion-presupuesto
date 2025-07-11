import { Button } from "@/components/ui/button";
import { useVariedades } from "@/hooks/useVariedades";
import { useAcciones } from "@/hooks/useAcciones";
import { useState, useEffect } from "react";
import { useLocation } from "react-router-dom";
import AccionButton from "@/components/accion-button";
import BackButton from "@/components/back-button";
import VariedadUpdateDialog from "@/components/variedad-update-dialog";
import BottomNav from "@/components/bottom-nav";

export default function Variedades() {
    const { getByBloque } = useVariedades();
    const { getLatestBatch } = useAcciones();
    const [variedades, setVariedades] = useState<any[]>([]);
    const [values, setValues] = useState<Record<string, any>>({});
    const { state } = useLocation();
    const bloqueId = state?.bloqueId; const loadValues = async (data: any[]) => {
        if (state?.accion && data) {
            const bloqueVariedadIds = data.map(variedad => variedad.bloque_variedad_id);
            const valueMap = await getLatestBatch(state.accion, bloqueVariedadIds);
            setValues(valueMap);
        }
    };

    const handleSaveSuccess = (bloqueVariedadId: string, value: number) => {
        setValues(prev => ({
            ...prev,
            [bloqueVariedadId]: value
        }));
    };

    useEffect(() => {
        if (bloqueId) {
            getByBloque(bloqueId).then(async (data) => {
                setVariedades(data || []);
                await loadValues(data || []);
            });
        }
    }, []);

    return (
        <div className="flex flex-col h-full justify-between">
            <header className="relative h-20 p-4 flex items-center justify-center flex-col">
                <AccionButton accion={state?.accion} />
                <p className="capitalize">{state?.fincaNombre} • {state?.nombre}</p>
                <BackButton
                    path="/bloques"
                    state={{ fincaId: state?.fincaId, nombre: state?.fincaNombre, accion: state?.accion }} />
            </header>
            <div className="gap-2 max-h-full grid overflow-y-auto mx-4">
                {variedades.map((variedad, index) => (<VariedadUpdateDialog
                    key={index}
                    variedad={variedad}
                    currentValue={values[variedad.bloque_variedad_id] ?? 0}
                    accion={state?.accion}
                    onSaveSuccess={handleSaveSuccess}
                >
                    <Button className="capitalize h-16 w-full text-lg flex justify-between items-center" >
                        <span>{variedad.nombre}</span>
                        <span className="text-sm opacity-75">
                            {values[variedad.bloque_variedad_id] ?? 0}
                        </span>
                    </Button>
                </VariedadUpdateDialog>))}
            </div>
            <BottomNav currentPage="acciones" />
        </div>
    );
}
