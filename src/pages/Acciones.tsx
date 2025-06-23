import { Button } from "@/components/ui/button";
import { useAcciones } from "@/hooks/useAcciones";
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";

export default function Acciones() {
    const { getColumns } = useAcciones();
    const [columns, setColumns] = useState<string[]>([]);
    const navigate = useNavigate();

    useEffect(() => {
        getColumns('acciones').then(data => setColumns(data || []));
    }, []);

    return (
        <div className="flex flex-col h-full justify-between">
            <header className="relative h-20 p-4">
                <p>Selecione una acción</p>
            </header>
            <div className="gap-2 max-h-full grid overflow-y-auto mx-4">
                {columns.map((accion, index) => (
                    <Button key={index}
                        className="capitalize h-16 w-full text-xl"
                        onClick={() => navigate('/fincas', { state: { accion } })}>
                        {accion.replace('_', ' ')}
                    </Button>
                ))}
            </div>
            <nav className="bg-zinc-700 h-16 m-4 rounded-full"></nav>
        </div>
    );
}
