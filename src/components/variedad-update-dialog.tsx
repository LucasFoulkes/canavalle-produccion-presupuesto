import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { useState, useEffect } from "react";

interface VariedadUpdateDialogProps {
    variedad: any;
    currentValue: number;
    onSave: (value: number) => Promise<void>;
    children: React.ReactNode;
}

export default function VariedadUpdateDialog({
    variedad,
    currentValue,
    onSave,
    children
}: VariedadUpdateDialogProps) {
    const [inputValue, setInputValue] = useState('');
    const [open, setOpen] = useState(false);

    useEffect(() => {
        if (open) {
            setInputValue(currentValue?.toString() || '0');
        }
    }, [open, currentValue]);

    const handleSave = async () => {
        if (inputValue && !isNaN(Number(inputValue))) {
            await onSave(Number(inputValue));
            setOpen(false);
            setInputValue('');
        }
    };

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                {children}
            </DialogTrigger>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Update {variedad?.nombre}</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                    <Input
                        type="number"
                        value={inputValue}
                        onChange={(e) => setInputValue(e.target.value)}
                        placeholder="Enter value"
                    />
                    <Button onClick={handleSave} className="w-full">
                        Save
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    );
}
