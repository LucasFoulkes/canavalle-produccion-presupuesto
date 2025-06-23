import { Button } from "@/components/ui/button";
import { useFincas } from "@/hooks/useFincas";
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";

export default function Fincas() {
    const { getAll } = useFincas();
    const [fincas, setFincas] = useState<any[]>([]);
    const navigate = useNavigate();

    useEffect(() => {
        getAll().then(data => setFincas(data || []));
    }, []);

    return (
        <div className="flex flex-col h-full justify-between">
            <header className="h-16 flex items-center justify-center m-4">
                Selecione una finca
            </header>
            <div className="gap-2 max-h-full grid overflow-y-auto mx-4 grid-cols-2">
                {fincas.map((finca, index) => (
                    <Button
                        key={index}
                        className="capitalize aspect-square h-full w-full text-xl"
                        onClick={() => navigate('/bloques', { state: { fincaId: finca.id, nombre: finca.nombre } })}
                    >
                        {finca.nombre}
                    </Button>
                ))}
            </div>
            <nav className="bg-zinc-700 h-16 m-4 rounded-full"></nav>
        </div>
    );
}
