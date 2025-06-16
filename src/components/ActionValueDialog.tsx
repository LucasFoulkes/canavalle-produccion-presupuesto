import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';

interface ActionValueDialogProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (value: number) => void;
    variedadName: string;
    actionName: string;
    currentValue: number;
}

export default function ActionValueDialog({
    isOpen,
    onClose,
    onSave,
    variedadName,
    actionName,
    currentValue
}: ActionValueDialogProps) {
    const [value, setValue] = useState(currentValue.toString());

    useEffect(() => {
        setValue(currentValue.toString());
    }, [currentValue]); const handleSave = () => {
        const numValue = parseFloat(value) || 0;
        onSave(numValue);
        onClose();
    };

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-md">                <DialogHeader>
                <DialogTitle className="text-xl font-bold text-center uppercase">
                    {actionName}
                </DialogTitle>
                <DialogDescription className="text-center">
                    Ingrese el valor para {variedadName}
                </DialogDescription>
            </DialogHeader>                <div className="space-y-6">
                    <div>
                        <Input
                            type="number"
                            value={value}
                            onChange={(e) => setValue(e.target.value)}
                            placeholder="Ingrese el valor"
                            className="text-lg text-center h-12"
                            autoFocus
                        />
                    </div>

                    <div className="flex gap-3">
                        <Button
                            variant="outline"
                            onClick={onClose}
                            className="flex-1 h-12"
                        >
                            Cancelar
                        </Button>
                        <Button
                            onClick={handleSave}
                            className="flex-1 h-12"
                        >
                            Guardar
                        </Button>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}
