import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Plus } from "lucide-react";
import { supabase } from "@/lib/supabase";

interface CreateEntryDialogProps {
    tableName: string;
    columns: string[];
    lookupData: Record<string, any>;
    onSuccess: () => void;
}

export default function CreateEntryDialog({ tableName, columns, lookupData, onSuccess }: CreateEntryDialogProps) {
    const [open, setOpen] = useState(false);
    const [formData, setFormData] = useState<Record<string, any>>({});
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        try {
            // Filter out id and timestamp columns for insert
            const insertData = Object.fromEntries(
                Object.entries(formData).filter(([key]) =>
                    key !== 'id' && !key.includes('_at')
                )
            );

            const { error } = await supabase
                .from(tableName)
                .insert([insertData]);

            if (error) throw error;

            setOpen(false);
            setFormData({});
            onSuccess();
        } catch (error) {
            console.error('Error creating entry:', error);
        } finally {
            setLoading(false);
        }
    };

    const renderField = (column: string) => {
        // Skip id and timestamp columns
        if (column === 'id' || column.includes('_at')) return null;

        const isRequired = column === 'nombre'; // Basic validation for nombre field        // Handle foreign key fields
        if (column.endsWith('_id') && lookupData[column]) {
            const options = Object.entries(lookupData[column]);

            return (
                <div key={column} className="space-y-2">
                    <Label htmlFor={column} className="capitalize">
                        {column.replace('_', ' ')} {isRequired && '*'}
                    </Label>
                    <Select
                        value={formData[column] || ''}
                        onValueChange={(value) => setFormData(prev => ({ ...prev, [column]: value }))}
                    >
                        <option value="">Seleccionar {column.replace('_', ' ')}</option>
                        {options.map(([id, name]) => (
                            <option key={id} value={id}>
                                {name as string}
                            </option>
                        ))}
                    </Select>
                </div>
            );
        }

        // Handle regular text fields
        return (
            <div key={column} className="space-y-2">
                <Label htmlFor={column} className="capitalize">
                    {column.replace('_', ' ')} {isRequired && '*'}
                </Label>
                <Input
                    id={column}
                    value={formData[column] || ''}
                    onChange={(e) => setFormData(prev => ({ ...prev, [column]: e.target.value }))}
                    placeholder={`Ingrese ${column.replace('_', ' ')}`}
                    required={isRequired}
                />
            </div>
        );
    };

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button className="w-full mt-4" size="lg">
                    <Plus className="w-4 h-4 mr-2" />
                    Crear {tableName.replace('_', ' ')}
                </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md max-h-[80vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle className="capitalize">
                        Crear nuevo {tableName.replace('_', ' ')}
                    </DialogTitle>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4">
                    {columns.map(renderField)}
                    <div className="flex gap-2 pt-4">
                        <Button
                            type="button"
                            variant="outline"
                            onClick={() => setOpen(false)}
                            className="flex-1"
                        >
                            Cancelar
                        </Button>
                        <Button
                            type="submit"
                            disabled={loading}
                            className="flex-1"
                        >
                            {loading ? 'Creando...' : 'Crear'}
                        </Button>
                    </div>
                </form>
            </DialogContent>
        </Dialog>
    );
}
