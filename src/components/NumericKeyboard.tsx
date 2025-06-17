import { Button } from "@/components/ui/button";
import { X, RotateCcw } from "lucide-react";

interface NumericKeyboardProps {
    onKeyPress: (key: string) => void;
    onDelete: () => void;
    onClear: () => void;
    disabled?: boolean;
}

export default function NumericKeyboard({
    onKeyPress,
    onDelete,
    onClear,
    disabled = false
}: NumericKeyboardProps) {
    const handleKeyPress = (key: string) => {
        if (!disabled) {
            onKeyPress(key);
        }
    };

    const renderKey = (key: string) => (
        <Button
            type="button"
            variant="outline"
            className={`
                w-16 h-16 text-lg font-medium rounded-lg transition-all duration-150
                ${disabled
                    ? 'opacity-50 cursor-not-allowed'
                    : 'hover-professional active:scale-95'
                }
                bg-card border-2 border-border hover:border-primary/20 focus:border-primary/40
            `}
            onClick={() => handleKeyPress(key)}
            disabled={disabled}
        >
            {key}
        </Button>
    );

    const renderActionKey = (
        icon: React.ReactNode,
        onClick: () => void,
        variant: 'clear' | 'delete' = 'delete'
    ) => (
        <Button
            type="button"
            variant={variant === 'clear' ? 'default' : 'outline'}
            className={`
                w-16 h-16 rounded-lg transition-all duration-150
                ${disabled
                    ? 'opacity-50 cursor-not-allowed'
                    : 'hover-professional active:scale-95'
                }
                ${variant === 'clear'
                    ? 'bg-gradient-primary text-white'
                    : 'bg-card border-2 border-border hover:border-primary/20'
                }
                flex items-center justify-center
            `}
            onClick={onClick}
            disabled={disabled}
        >
            {icon}
        </Button>
    );

    return (
        <div className="p-6 rounded-xl glass-professional shadow-professional-lg">
            <div className="grid grid-cols-3 gap-4 max-w-xs mx-auto">
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
                    <RotateCcw className="h-4 w-4" />,
                    onClear,
                    'clear'
                )}
                {renderKey('0')}
                {renderActionKey(
                    <X className="h-4 w-4" />,
                    onDelete
                )}
            </div>
        </div>
    );
}
