interface GridCardProps {
    title: string;
    onClick?: () => void;
    className?: string;
}

export default function GridCard({ title, onClick, className = "" }: GridCardProps) {
    const baseClasses = `
        bg-card text-card-foreground rounded-lg border shadow-sm 
        flex items-center justify-center p-2 cursor-pointer text-lg
        hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors
    `.trim();

    // If className includes aspect-square, use it, otherwise default to aspect-square
    const aspectRatio = className.includes('aspect-square') || className === '' ? 'aspect-square' : '';

    return (
        <div
            className={`${baseClasses} ${aspectRatio} ${className}`.trim()}
            onClick={onClick}
        >
            <span className="text-center font-semibold">{title}</span>
        </div>
    );
}
