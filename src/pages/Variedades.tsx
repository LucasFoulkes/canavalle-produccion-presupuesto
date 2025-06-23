import { Button } from "@/components/ui/button";
import { useVariedades } from "@/hooks/useVariedades";
import { useState, useEffect } from "react";
import { useLocation } from "react-router-dom";
import AccionButton from "@/components/accion-button";
import BackButton from "@/components/back-button";

export default function Variedades() {
    const { getByBloque } = useVariedades();
    const [variedades, setVariedades] = useState<any[]>([]);
    const { state } = useLocation();
    const bloqueId = state?.bloqueId;

    useEffect(() => {
        if (bloqueId) {
            getByBloque(bloqueId).then(data => setVariedades(data || []));
        }
    }, []);

    return (
        <div className="flex flex-col h-full justify-between">
            <header className="relative h-20 p-4 flex items-center justify-center flex-col">
                <AccionButton accion={state?.accion} />
                <p className="capitalize">{state?.fincaNombre} • {state?.nombre}</p>
                <BackButton
                    path="/bloques"
                    state={{ fincaId: state?.fincaId, nombre: state?.fincaNombre, accion: state?.accion }}
                />
            </header>
            <div className="gap-2 max-h-full grid overflow-y-auto mx-4">
                {variedades.map((variedad, index) => (
                    <Button key={index} className="capitalize h-16 w-full text-lg">
                        {variedad.nombre}
                    </Button>
                ))}
            </div>
            <nav className="bg-zinc-700 h-16 m-4 rounded-full"></nav>
        </div>
    );
}
