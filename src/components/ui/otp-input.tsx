import * as React from "react";
import { cn } from "@/lib/utils";

interface OTPInputProps {
    length?: number;
    onComplete?: (value: string) => void;
    className?: string;
}

const OTPInput = ({ length = 4, onComplete, className }: OTPInputProps) => {
    const [values, setValues] = React.useState<string[]>(Array(length).fill(""));
    const inputRefs = React.useRef<(HTMLInputElement | null)[]>([]);

    // Initialize the inputRefs array with null values
    React.useEffect(() => {
        inputRefs.current = inputRefs.current.slice(0, length);
        while (inputRefs.current.length < length) {
            inputRefs.current.push(null);
        }
    }, [length]);

    // Focus the first input when the component mounts
    React.useEffect(() => {
        if (inputRefs.current[0]) {
            inputRefs.current[0].focus();
        }
    }, []);

    const handleChange = (index: number, value: string) => {
        // Only accept single digits
        if (!/^\d*$/.test(value)) return;

        const newValues = [...values];

        // Update the value at the current index
        newValues[index] = value.slice(-1);
        setValues(newValues);

        // If a digit was entered and there's a next input, focus it
        if (value && index < length - 1) {
            inputRefs.current[index + 1]?.focus();
        }

        // If all inputs are filled, call onComplete
        const filledValues = newValues.filter(Boolean);
        if (filledValues.length === length && onComplete) {
            onComplete(newValues.join(""));
        }
    };

    const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
        // Handle backspace
        if (e.key === "Backspace") {
            if (!values[index] && index > 0) {
                // If current input is empty and backspace was pressed, focus previous input
                inputRefs.current[index - 1]?.focus();
            }
        }

        // Handle left arrow key
        else if (e.key === "ArrowLeft" && index > 0) {
            inputRefs.current[index - 1]?.focus();
        }

        // Handle right arrow key
        else if (e.key === "ArrowRight" && index < length - 1) {
            inputRefs.current[index + 1]?.focus();
        }
    };

    const handlePaste = (e: React.ClipboardEvent) => {
        e.preventDefault();
        const pastedData = e.clipboardData.getData("text");

        // Filter out non-digit characters
        const digits = pastedData.replace(/\D/g, "").slice(0, length);

        if (!digits) return;

        // Fill in the values array with pasted digits
        const newValues = [...values];
        for (let i = 0; i < digits.length; i++) {
            if (i < length) {
                newValues[i] = digits[i];
            }
        }

        setValues(newValues);

        // Focus the appropriate input after pasting
        const focusIndex = Math.min(digits.length, length - 1);
        inputRefs.current[focusIndex]?.focus();

        // Call onComplete if all inputs are filled
        if (digits.length === length && onComplete) {
            onComplete(newValues.join(""));
        }
    };

    return (
        <div className={cn("flex gap-2", className)}>
            {Array.from({ length }).map((_, index) => (
                <input
                    key={index}
                    ref={(el) => {
                        inputRefs.current[index] = el;
                    }}
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    maxLength={1}
                    value={values[index] || ""}
                    onChange={(e) => handleChange(index, e.target.value)}
                    onKeyDown={(e) => handleKeyDown(index, e)}
                    onPaste={index === 0 ? handlePaste : undefined}
                    className={cn(
                        "h-14 w-14 rounded-md border border-input bg-background p-2 text-center text-xl shadow-sm transition-all focus:outline-none focus:ring-2 focus:ring-ring"
                    )}
                    aria-label={`Digit ${index + 1}`}
                    autoComplete="off"
                />
            ))}
        </div>
    );
};

OTPInput.displayName = "OTPInput";

export { OTPInput };

// Initialize the inputRefs array with null values
React.useEffect(() => {
    inputRefs.current = inputRefs.current.slice(0, length);
    while (inputRefs.current.length < length) {
        inputRefs.current.push(null);
    }
}, [length]);

// Focus the first input when the component mounts
React.useEffect(() => {
    if (inputRefs.current[0]) {
        inputRefs.current[0].focus();
    }
}, []);

const handleChange = (index: number, value: string) => {
    // Only accept single digits
    if (!/^\d*$/.test(value)) return;

    const newValues = [...values];

    // Update the value at the current index
    newValues[index] = value.slice(-1);
    setValues(newValues);

    // If a digit was entered and there's a next input, focus it
    if (value && index < length - 1) {
        inputRefs.current[index + 1]?.focus();
    }

    // If all inputs are filled, call onComplete
    const filledValues = newValues.filter(Boolean);
    if (filledValues.length === length && onComplete) {
        onComplete(newValues.join(""));
    }
};

const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    // Handle backspace
    if (e.key === "Backspace") {
        if (!values[index] && index > 0) {
            // If current input is empty and backspace was pressed, focus previous input
            inputRefs.current[index - 1]?.focus();
        }
    }

    // Handle left arrow key
    else if (e.key === "ArrowLeft" && index > 0) {
        inputRefs.current[index - 1]?.focus();
    }

    // Handle right arrow key
    else if (e.key === "ArrowRight" && index < length - 1) {
        inputRefs.current[index + 1]?.focus();
    }
};

const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData("text");

    // Filter out non-digit characters
    const digits = pastedData.replace(/\D/g, "").slice(0, length);

    if (!digits) return;

    // Fill in the values array with pasted digits
    const newValues = [...values];
    for (let i = 0; i < digits.length; i++) {
        if (i < length) {
            newValues[i] = digits[i];
        }
    }

    setValues(newValues);

    // Focus the appropriate input after pasting
    const focusIndex = Math.min(digits.length, length - 1);
    inputRefs.current[focusIndex]?.focus();

    // Call onComplete if all inputs are filled
    if (digits.length === length && onComplete) {
        onComplete(newValues.join(""));
    }
};

return (
    <div className={cn("flex gap-2", className)}>
        {Array.from({ length }).map((_, index) => (
            <input
                key={index}
                ref={(el) => (inputRefs.current[index] = el)}
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                maxLength={1}
                value={values[index] || ""}
                onChange={(e) => handleChange(index, e.target.value)}
                onKeyDown={(e) => handleKeyDown(index, e)}
                onPaste={index === 0 ? handlePaste : undefined}
                className={cn(
                    "h-14 w-14 rounded-md border border-input bg-background p-2 text-center text-xl shadow-sm transition-all focus:outline-none focus:ring-2 focus:ring-ring",
                    props.className
                )}
                aria-label={`Digit ${index + 1}`}
                autoComplete="off"
            />
        ))}
    </div>
);
}
);

OTPInput.displayName = "OTPInput";

export { OTPInput };
