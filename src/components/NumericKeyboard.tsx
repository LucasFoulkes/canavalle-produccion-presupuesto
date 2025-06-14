import { Button } from "@/components/ui/button";
import { X } from "lucide-react";

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
            variant="ghost"
            className="w-[70px] h-[70px] text-2xl font-light rounded-full bg-gray-100/80 dark:bg-gray-800/80 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
            onClick={() => handleKeyPress(key)}
            disabled={disabled}
        >
            {key}
        </Button>
    );

    return (
        <div className="w-full max-w-xs mx-auto mt-8">
            <div className="grid grid-cols-3 gap-4">
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
                <Button
                    type="button"
                    variant="ghost"
                    className="w-[70px] h-[70px] font-light rounded-full bg-gray-100/80 dark:bg-gray-800/80 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
                    onClick={onClear}
                    disabled={disabled}
                >
                    C
                </Button>
                {renderKey('0')}
                <Button
                    type="button"
                    variant="ghost"
                    className="w-[70px] h-[70px] rounded-full bg-gray-100/80 dark:bg-gray-800/80 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors flex items-center justify-center"
                    onClick={onDelete}
                    disabled={disabled}
                >
                    <X className="h-6 w-6" />
                </Button>
            </div>
        </div>
    );
}
