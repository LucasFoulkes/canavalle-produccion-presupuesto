import { Button } from "./ui/button";

interface GridCardProps {
    title: string;
    onClick?: () => void;
}

export default function GridCard({ title, onClick, }: GridCardProps) {
    return (
        // <div
        //     className={`bg-card text-card-foreground rounded-lg border shadow-sm uppercase
        //                flex items-center justify-center p-2 cursor-pointer text-lg ${className}`}
        //     onClick={onClick}
        // >
        //     <span className="text-center font-semibold">{title}</span>
        // </div>
        <Button className="aspect-square w-full h-full uppercase text-lg" onClick={onClick} variant="outline">
            {title}
        </Button>
    );
}
