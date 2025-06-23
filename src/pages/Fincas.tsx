import { Button } from "@/components/ui/button";
import { useFincas } from "@/hooks/useFincas";
import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { ChevronLeftCircle } from "lucide-react";

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
            <header className="relative h-20 p-4">
                <h1 className="capitalize text-lg font-semibold">{state?.accion}</h1>
                <p>Selecione una finca</p>
                <ChevronLeftCircle
                    className="stroke-1 text-zinc-300 cursor-pointer size-20 absolute right-0 top-0 p-4 "
                    onClick={() => navigate('/acciones',)}
                />
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
                ))}
            </div>
            <nav className="bg-zinc-700 h-16 m-4 rounded-full"></nav>
        </div>
    );
}
