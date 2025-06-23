import { Button } from "@/components/ui/button";
import { useVariedades } from "@/hooks/useVariedades";
import { ChevronLeftCircle } from "lucide-react";
import { useState, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
// import { Badge } from "@/components/ui/badge";

export default function Variedades() {
    const { getByBloque } = useVariedades();
    const [variedades, setVariedades] = useState<any[]>([]);
    const { state } = useLocation();
    const bloqueId = state?.bloqueId;
    const navigate = useNavigate();

    useEffect(() => {
        if (bloqueId) {
            getByBloque(bloqueId).then(data => setVariedades(data || []));
        }
    }, []);

    return (
        <div className="flex flex-col h-full justify-between">
            <header className="relative h-20 p-4 flex items-center justify-center flex-col">
                {/* <Badge className="capitalize">{state?.accion.replace(/_/g, " ")}</Badge> */}
                <Button className="capitalize absolute top-0 left-0 rounded-none rounded-br-xl text-xs p-2">{state?.accion?.replace(/_/g, " ")}</Button>
                <p className="capitalize">{state?.fincaNombre} • {state?.nombre}</p>
                <ChevronLeftCircle
                    className="stroke-1 text-zinc-300 cursor-pointer size-20 absolute right-0 top-0 p-4"
                    onClick={() => navigate('/bloques', { state: { fincaId: state?.fincaId, nombre: state?.fincaNombre, accion: state?.accion } })}
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
