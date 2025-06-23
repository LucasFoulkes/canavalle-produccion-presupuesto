// import { Button } from "@/components/ui/button";

// interface AccionButtonProps {
//     accion?: string;
// }

// export default function AccionButton({ accion }: AccionButtonProps) {
//     return (
//         <Button className="capitalize absolute top-0 left-0 rounded-none rounded-r-xl text-xs p-2">
//             {accion?.replace(/_/g, " ")}
//         </Button>
//     );
// }
import { useNavigate } from "react-router-dom";

interface AccionButtonProps {
    accion?: string;
}

export default function AccionButton({ accion }: AccionButtonProps) {
    const words = accion?.replace(/_/g, " ").split(" ") || [];
    const navigate = useNavigate();

    return (<div className="absolute top-2 left-2 size-20 bg-blue-500 text-white rounded-full flex flex-col items-center justify-center text-[10px] font-medium capitalize leading-none p-3"
        onClick={() => navigate('/acciones')}>
        {words.map((word, index) => (
            <span key={index}>{word}</span>
        ))}
    </div>
    );
}