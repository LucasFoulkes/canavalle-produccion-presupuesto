import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Trash2, Save } from "lucide-react";
import { supabase } from "@/lib/supabase";

interface EditEntryDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    tableName: string;
    entry: any;
    columns: string[];
    lookupData: Record<string, any>;
    onSuccess: () => void;
}

export default function EditEntryDialog({
    open,
    onOpenChange,
    tableName,
    entry,
    columns,
    lookupData,
    onSuccess
}: EditEntryDialogProps) {
    const [formData, setFormData] = useState<Record<string, any>>(entry || {});
    const [loading, setLoading] = useState(false);
    const [deleteLoading, setDeleteLoading] = useState(false);

    const handleUpdate = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        try {
            // Filter out nested objects and prepare update data
            const updateData = Object.fromEntries(
                Object.entries(formData).filter(([key, value]) =>
                    !key.includes('_at') &&
                    typeof value !== 'object'
                )
            );

            const { error } = await supabase
                .from(tableName)
                .update(updateData)
                .eq('id', entry.id);

            if (error) throw error;

            onOpenChange(false);
            onSuccess();
        } catch (error) {
            console.error('Error updating entry:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async () => {
        if (!confirm(`¿Está seguro de que desea eliminar este ${tableName.replace('_', ' ')}?`)) {
            return;
        }

        setDeleteLoading(true);

        try {
            const { error } = await supabase
                .from(tableName)
                .delete()
                .eq('id', entry.id);

            if (error) throw error;

            onOpenChange(false);
            onSuccess();
        } catch (error) {
            console.error('Error deleting entry:', error);
        } finally {
            setDeleteLoading(false);
        }
    };

    const renderField = (column: string) => {
        // Skip id and timestamp columns
        if (column === 'id' || column.includes('_at')) return null;

        const isRequired = column === 'nombre';

        // Handle foreign key fields
        if (column.endsWith('_id') && lookupData[column]) {
            const options = Object.entries(lookupData[column]);

            return (
                <div key={column} className="space-y-2">
                    <Label htmlFor={column} className="capitalize">
                        {column.replace('_', ' ')} {isRequired && '*'}
                    </Label>                    <Select
                        value={formData[column]?.toString() || ''}
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
                    value={formData[column]?.toString() || ''}
                    onChange={(e) => setFormData(prev => ({ ...prev, [column]: e.target.value }))}
                    placeholder={`Ingrese ${column.replace('_', ' ')}`}
                    required={isRequired}
                />
            </div>
        );
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-md max-h-[80vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle className="capitalize">
                        Editar {tableName.replace('_', ' ')}
                    </DialogTitle>
                </DialogHeader>
                <form onSubmit={handleUpdate} className="space-y-4">
                    {columns.map(renderField)}
                    <div className="flex gap-2 pt-4">
                        <Button
                            type="button"
                            variant="destructive"
                            onClick={handleDelete}
                            disabled={deleteLoading}
                            className="flex-1"
                        >
                            <Trash2 className="w-4 h-4 mr-2" />
                            {deleteLoading ? 'Eliminando...' : 'Eliminar'}
                        </Button>
                        <Button
                            type="submit"
                            disabled={loading}
                            className="flex-1"
                        >
                            <Save className="w-4 h-4 mr-2" />
                            {loading ? 'Guardando...' : 'Guardar'}
                        </Button>
                    </div>
                </form>
            </DialogContent>
        </Dialog>
    );
}
