import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { useState, useEffect } from "react";
import { useAcciones } from "@/hooks/useAcciones";

interface VariedadUpdateDialogProps {
    variedad: any;
    currentValue: number;
    accion: string;
    onSaveSuccess: (bloqueVariedadId: string, value: number) => void;
    children: React.ReactNode;
}

export default function VariedadUpdateDialog({
    variedad,
    currentValue,
    accion,
    onSaveSuccess,
    children
}: VariedadUpdateDialogProps) {
    const { update } = useAcciones();
    const [inputValue, setInputValue] = useState('');
    const [open, setOpen] = useState(false);

    useEffect(() => {
        if (open) {
            setInputValue(currentValue?.toString() || '0');
        }
    }, [open, currentValue]); const handleSave = async () => {
        if (inputValue && !isNaN(Number(inputValue))) {
            const success = await update(accion, variedad.bloque_variedad_id, Number(inputValue));
            if (success) {
                onSaveSuccess(variedad.bloque_variedad_id, Number(inputValue));
                setOpen(false);
                setInputValue('');
            }
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
                        className="w-full h-16 text-lg"
                    />
                    <Button onClick={handleSave} className="w-full h-16 text-lg">
                        Save
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    );
}
