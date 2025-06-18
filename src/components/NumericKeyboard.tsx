import { Button } from "@/components/ui/button";
import { X, RotateCcw } from "lucide-react";

interface NumericKeyboardProps {
    onKeyPress: (key: string) => void;
    onDelete: () => void;
    onClear: () => void;
    disabled?: boolean;
    minimal?: boolean; // New prop for iPhone-style minimal design
}

export default function NumericKeyboard({
    onKeyPress,
    onDelete,
    onClear,
    disabled = false,
    minimal = false
}: NumericKeyboardProps) {
    const handleKeyPress = (key: string) => {
        if (!disabled) {
            onKeyPress(key);
        }
    }; const renderKey = (key: string) => (
        <Button
            type="button"
            variant="ghost"
            className={`                ${minimal
                ? 'w-20 h-20 text-2xl font-light rounded-full bg-muted/10 hover:bg-muted/20 active:bg-muted/30 border border-black/30 hover:border-black/50 transition-colors duration-200 flex items-center justify-center aspect-square'
                : 'w-16 h-16 text-lg font-medium rounded-lg bg-card border-2 border-border hover:border-primary/20 focus:border-primary/40 hover-professional'
                }
                ${disabled
                    ? 'opacity-50 cursor-not-allowed'
                    : minimal ? 'active:scale-95' : 'active:scale-95'
                }
                transition-all duration-150
            `}
            onClick={() => handleKeyPress(key)}
            disabled={disabled}
        >
            {key}
        </Button>
    ); const renderActionKey = (
        icon: React.ReactNode,
        onClick: () => void,
        variant: 'clear' | 'delete' = 'delete'
    ) => (
        <Button
            type="button"
            variant="ghost" className={`                ${minimal
                ? 'w-20 h-20 rounded-full bg-muted/10 hover:bg-muted/20 active:bg-muted/30 border border-black/30 hover:border-black/50 transition-colors duration-200 flex items-center justify-center aspect-square'
                : `w-16 h-16 rounded-lg transition-all duration-150 ${variant === 'clear'
                    ? 'bg-gradient-primary text-white'
                    : 'bg-card border-2 border-border hover:border-primary/20'
                }`
                }
                ${disabled
                    ? 'opacity-50 cursor-not-allowed'
                    : minimal ? 'active:scale-95' : 'hover-professional active:scale-95'
                }
                flex items-center justify-center
            `}
            onClick={onClick}
            disabled={disabled}
        >
            {icon}
        </Button>
    ); return (
        <div className={minimal ? "max-w-xs mx-auto" : "p-6 rounded-xl glass-professional shadow-professional-lg"}>
            <div className={`grid grid-cols-3 ${minimal ? 'gap-6' : 'gap-4'} max-w-xs mx-auto`}>
                {/* First row */}
                {renderKey('1')}
                {renderKey('2')}
                {renderKey('3')}

                {/* Second row */}
                {renderKey('4')}
                {renderKey('5')}
                {renderKey('6')}

                {/* Third row */}
                {renderKey('7')}
                {renderKey('8')}
                {renderKey('9')}

                {/* Fourth row */}
                {renderActionKey(
                    <RotateCcw className={minimal ? "h-5 w-5" : "h-4 w-4"} />,
                    onClear,
                    'clear'
                )}
                {renderKey('0')}
                {renderActionKey(
                    <X className={minimal ? "h-5 w-5" : "h-4 w-4"} />,
                    onDelete
                )}
            </div>
        </div>
    );
}
