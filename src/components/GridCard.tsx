interface GridCardProps {
    title: string;
    onClick?: () => void;
    className?: string;
}

export default function GridCard({ title, onClick, className = "" }: GridCardProps) {
    return (
        <div
            className={`bg-card text-card-foreground rounded-lg border shadow-sm 
                       flex items-center justify-center p-2 cursor-pointer text-lg ${className}`}
            onClick={onClick}
        >
            <span className="text-center font-semibold">{title}</span>
        </div>
    );
}
