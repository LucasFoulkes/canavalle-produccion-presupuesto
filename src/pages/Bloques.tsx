import { Button } from "@/components/ui/button";
import { useBloques } from "@/hooks/useBloques";
import { useState, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import AccionButton from "@/components/accion-button";
import BackButton from "@/components/back-button";
import BottomNav from "@/components/bottom-nav";

export default function Bloques() {
    const { getByFinca } = useBloques();
    const [bloques, setBloques] = useState<any[]>([]);
    const { state } = useLocation();
    const fincaId = state?.fincaId;
    const navigate = useNavigate();

    useEffect(() => {
        if (fincaId) {
            getByFinca(fincaId).then(data => setBloques(data || []));
        }
    }, []);

    return (
        <div className="flex flex-col h-full justify-between">
            <header className="relative h-20 p-4 flex items-center justify-center flex-col">
                <AccionButton accion={state?.accion} />
                <p className="capitalize">{state?.nombre}</p>
                <BackButton
                    path="/fincas"
                    state={{ accion: state?.accion }}
                />
            </header>
            <div className="gap-2 max-h-full grid overflow-y-auto mx-4 grid-cols-4">
                {bloques.map((bloque, index) => (
                    <Button
                        key={index}
                        className="capitalize aspect-square h-full w-full text-xl"
                        onClick={() => navigate('/variedades', {
                            state: {
                                bloqueId: bloque.id,
                                nombre: bloque.nombre,
                                fincaId: state?.fincaId,
                                fincaNombre: state?.nombre,
                                accion: state?.accion
                            }
                        })}
                    >
                        {bloque.nombre}
                    </Button>
                ))}            </div>
            <BottomNav currentPage="acciones" />
        </div>
    );
}
