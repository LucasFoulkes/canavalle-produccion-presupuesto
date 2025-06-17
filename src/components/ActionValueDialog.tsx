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
import { Calculator, Save, X } from 'lucide-react';

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
    }, [currentValue]);

    const handleSave = () => {
        const numValue = parseFloat(value) || 0;
        onSave(numValue);
        onClose();
    };

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-md glass-professional shadow-professional-xl border animate-fade-in">
                <DialogHeader>
                    <div className="flex items-center gap-3 mb-2">
                        <Calculator className="h-5 w-5 text-professional-primary" />
                        <DialogTitle className="text-xl font-semibold text-professional-primary">
                            {actionName}
                        </DialogTitle>
                    </div>
                    <DialogDescription className="text-professional-muted">
                        Registrar valor para{' '}
                        <span className="font-medium text-professional-primary">
                            {variedadName}
                        </span>
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-6">
                    <div className="space-y-2">
                        <label className="text-sm font-medium text-professional-muted">
                            Valor
                        </label>
                        <Input
                            type="number"
                            value={value}
                            onChange={(e) => setValue(e.target.value)}
                            placeholder="0.00"
                            className="text-lg text-center h-12 focus:ring-2 focus:ring-primary/20"
                            autoFocus
                        />
                        {currentValue > 0 && (
                            <p className="text-xs text-professional-muted">
                                Valor actual: <span className="font-medium">{currentValue}</span>
                            </p>
                        )}
                    </div>

                    <div className="flex gap-3">
                        <Button
                            variant="outline"
                            onClick={onClose}
                            className="flex-1 h-11 hover-professional"
                        >
                            <X className="h-4 w-4 mr-2" />
                            Cancelar
                        </Button>
                        <Button
                            onClick={handleSave}
                            className="flex-1 h-11 bg-gradient-primary hover:opacity-90 hover-professional"
                        >
                            <Save className="h-4 w-4 mr-2" />
                            Guardar
                        </Button>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}
