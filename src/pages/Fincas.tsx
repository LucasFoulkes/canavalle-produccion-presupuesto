import { Button } from "@/components/ui/button";
import { useFincas } from "@/hooks/useFincas";
import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import AccionButton from "@/components/accion-button";
import BackButton from "@/components/back-button";
import BottomNav from "@/components/bottom-nav";

export default function Fincas() {
    const { getAll } = useFincas();
    const [fincas, setFincas] = useState<any[]>([]);
    const navigate = useNavigate();
    const { state } = useLocation();

    useEffect(() => {
        getAll().then(data => setFincas(data || []));
    }, []);

    return (
        <div className="flex flex-col h-full justify-between">
            <header className="relative h-20 p-4 flex items-center justify-center">
                <AccionButton accion={state?.accion} />
                <BackButton path="/acciones" />
            </header>
            <div className="gap-2 max-h-full grid overflow-y-auto mx-4 grid-cols-2">
                {fincas.map((finca, index) => (
                    <Button
                        key={index}
                        className="capitalize aspect-square h-full w-full text-xl"
                        onClick={() => navigate('/bloques', { state: { fincaId: finca.id, nombre: finca.nombre, accion: state.accion } })}
                    >
                        {finca.nombre}
                    </Button>
                ))}            </div>
            <BottomNav currentPage="acciones" />
        </div>
    );
}
