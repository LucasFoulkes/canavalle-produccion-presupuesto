import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import BottomNav from "@/components/bottom-nav";

export default function Reportes() {
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
                <p className="text-xl font-medium">Reportes</p>
            </header>

            <div className="flex-1 flex flex-col items-center justify-center mx-4 text-center">
                <div className="mb-8">
                    <svg className="w-24 h-24 mx-auto text-gray-400 mb-4" fill="currentColor" viewBox="0 0 20 20">
                        <path d="M2 11a1 1 0 011-1h2a1 1 0 011 1v5a1 1 0 01-1 1H3a1 1 0 01-1-1v-5zM8 7a1 1 0 011-1h2a1 1 0 011 1v9a1 1 0 01-1 1H9a1 1 0 01-1-1V7zM14 4a1 1 0 011-1h2a1 1 0 011 1v12a1 1 0 01-1 1h-2a1 1 0 01-1-1V4z" />
                    </svg>
                </div>
                <h2 className="text-2xl font-bold text-gray-700 mb-2">En Construcción</h2>
                <p className="text-gray-500 mb-6">
                    La página de reportes está siendo desarrollada.
                </p>
                <div className="animate-pulse flex space-x-1">
                    <div className="rounded-full bg-gray-400 h-2 w-2"></div>
                    <div className="rounded-full bg-gray-400 h-2 w-2"></div>
                    <div className="rounded-full bg-gray-400 h-2 w-2"></div>
                </div>
            </div>
            <BottomNav currentPage="reportes" />
        </div>
    );
}
