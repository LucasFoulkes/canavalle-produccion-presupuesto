import { Button } from "@/components/ui/button";
import { useBloques } from "@/hooks/useBloques";
import { ChevronLeftCircle } from "lucide-react";
import { useState, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";

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
            <header className="relative h-20 p-4">
                <h1 className="capitalize text-lg font-semibold">{state?.nombre}</h1>
                <p>Selecione un bloque</p>
                <ChevronLeftCircle
                    className="stroke-1 text-zinc-300 cursor-pointer size-full w-fit absolute right-0 top-0 p-4 "
                    onClick={() => navigate('/fincas')}
                />
            </header>            <div className="gap-2 max-h-full grid overflow-y-auto mx-4 grid-cols-4">
                {bloques.map((bloque, index) => (
                    <Button
                        key={index}
                        className="capitalize aspect-square h-full w-full"
                        onClick={() => navigate('/variedades', {
                            state: {
                                bloqueId: bloque.id,
                                nombre: bloque.nombre,
                                fincaId: state?.fincaId,
                                fincaNombre: state?.nombre
                            }
                        })}
                    >
                        {bloque.nombre}
                    </Button>
                ))}
            </div>
            <nav className="bg-zinc-700 h-16 m-4 rounded-full"></nav>
        </div>
    );
}
