interface AccionButtonProps {
    accion?: string;
}

export default function AccionButton({ accion }: AccionButtonProps) {
    const words = accion?.replace(/_/g, " ").split(" ") || [];
    
    return (        <div className="absolute top-4 left-4 size-16 bg-blue-500 text-white rounded-full flex flex-col items-center justify-center text-xs font-medium capitalize leading-tight p-2">
            {words.map((word, index) => (
                <span key={index}>{word}</span>
            ))}
        </div>
    );
}