import { useNavigate } from "react-router-dom";
import { Calendar, Settings, BarChart3, LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/button";

type PageKey = 'acciones' | 'config' | 'reportes';

interface NavItem {
    id: PageKey;
    icon: LucideIcon;
    label: string;
    route: string;
}

interface BottomNavProps {
    currentPage: PageKey;
}

const navItems: NavItem[] = [
    { id: 'acciones', icon: Calendar, label: 'Acción', route: '/acciones' },
    { id: 'config', icon: Settings, label: 'Config', route: '/config' },
    { id: 'reportes', icon: BarChart3, label: 'Reportes', route: '/reportes' },
];

export default function BottomNav({ currentPage }: BottomNavProps) {
    const navigate = useNavigate();

    return (
        <nav className="bg-zinc-900 rounded-full shadow-lg m-4">
            <div className="flex items-center justify-around h-14">
                {navItems.map((item) => {
                    const Icon = item.icon;
                    const isActive = currentPage === item.id; return (<Button
                        key={item.id}
                        variant="ghost"
                        onClick={() => navigate(item.route)}
                        className={`flex flex-col items-center h-full justify-center p-2 rounded-full w-full transition-all duration-200 ease-in-out text-white flex-1 gap-1
                                ${isActive
                                ? "bg-zinc-800"
                                : ""
                            }`}
                    >
                        <Icon className={` w-4 h-4  ${isActive ? "text-white}" : "text-zinc-400"}`} />
                        <span className={`font-medium ${isActive ? "text-sm" : "text-xs text-zinc-400"}`}>{item.label}</span>
                    </Button>
                    );
                })}
            </div>
        </nav>
    );
}
