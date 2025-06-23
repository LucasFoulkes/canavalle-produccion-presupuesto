import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { Calendar, Settings, BarChart3, LucideIcon } from "lucide-react";

interface BottomNavProps {
    currentPage: 'acciones' | 'config' | 'reportes';
}

interface NavButtonProps {
    icon: LucideIcon;
    label: string;
    route: string;
    isActive: boolean;
    onClick: () => void;
}

function NavButton({ icon: Icon, label, isActive, onClick }: NavButtonProps) {
    return (
        <Button
            variant="ghost"
            className={`text-white h-12 px-4 flex h-full rounded-none flex-col items-center gap-1 ${isActive ? 'bg-zinc-600' : 'hover:bg-zinc-600'
                }`}
            onClick={onClick}
        >
            <Icon className="w-5 h-5" />
            <span className="text-xs">{label}</span>
        </Button>
    );
}

export default function BottomNav({ currentPage }: BottomNavProps) {
    const navigate = useNavigate();

    return (
        <nav className="bg-zinc-700 h-16 m-4 rounded-full flex items-center justify-around px-2">
            <NavButton
                icon={Calendar}
                label="Acción"
                route="/acciones"
                isActive={currentPage === 'acciones'}
                onClick={() => navigate('/acciones')}
            />
            <NavButton
                icon={Settings}
                label="Config"
                route="/config"
                isActive={currentPage === 'config'}
                onClick={() => navigate('/config')}
            />
            <NavButton
                icon={BarChart3}
                label="Reportes"
                route="/reportes"
                isActive={currentPage === 'reportes'}
                onClick={() => navigate('/reportes')}
            />
        </nav>
    );
}
