import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import BottomNav from "@/components/bottom-nav";

export default function Config() {
    const navigate = useNavigate();

    return (
        <div className="flex flex-col h-full justify-between">
            <header className="relative h-20 p-4 items-center justify-center flex">
                <Button
                    variant="ghost"
                    className="absolute left-4 p-2"
                    onClick={() => navigate('/acciones')}
                >
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                    </svg>
                </Button>
                <p className="text-xl font-medium">Configuración</p>
            </header>

            <div className="flex-1 flex flex-col items-center justify-center mx-4 text-center">
                <div className="mb-8">
                    <svg className="w-24 h-24 mx-auto text-gray-400 mb-4" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M11.49 3.17c-.38-1.56-2.6-1.56-2.98 0a1.532 1.532 0 01-2.286.948c-1.372-.836-2.942.734-2.106 2.106.54.886.061 2.042-.947 2.287-1.561.379-1.561 2.6 0 2.978a1.532 1.532 0 01.947 2.287c-.836 1.372.734 2.942 2.106 2.106a1.532 1.532 0 012.287.947c.379 1.561 2.6 1.561 2.978 0a1.533 1.533 0 012.287-.947c1.372.836 2.942-.734 2.106-2.106a1.533 1.533 0 01.947-2.287c1.561-.379 1.561-2.6 0-2.978a1.532 1.532 0 01-.947-2.287c.836-1.372-.734-2.942-2.106-2.106a1.532 1.532 0 01-2.287-.947zM10 13a3 3 0 100-6 3 3 0 000 6z" clipRule="evenodd" />
                    </svg>
                </div>
                <h2 className="text-2xl font-bold text-gray-700 mb-2">En Construcción</h2>
                <p className="text-gray-500 mb-6">
                    La página de configuración está siendo desarrollada.
                </p>
                <div className="animate-pulse flex space-x-1">
                    <div className="rounded-full bg-gray-400 h-2 w-2"></div>
                    <div className="rounded-full bg-gray-400 h-2 w-2"></div>
                    <div className="rounded-full bg-gray-400 h-2 w-2"></div>
                </div>
            </div>
            <BottomNav currentPage="config" />
        </div>
    );
}
