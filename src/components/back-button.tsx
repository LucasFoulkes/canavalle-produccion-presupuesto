import { ChevronLeftCircle } from "lucide-react";
import { useNavigate } from "react-router-dom";

interface BackButtonProps {
    path: string;
    state?: any;
}

export default function BackButton({ path, state }: BackButtonProps) {
    const navigate = useNavigate();

    return (
        <ChevronLeftCircle
            className="stroke-1 text-zinc-200 cursor-pointer size-20 absolute right-0 top-0 p-4"
            onClick={() => navigate(path, state ? { state } : undefined)}
        />
    );
}
