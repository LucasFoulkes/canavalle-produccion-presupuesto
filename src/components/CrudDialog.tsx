import { useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Spinner } from '@/components/ui/spinner'
import { PlusIcon, EditIcon, TrashIcon } from 'lucide-react'

interface CrudDialogProps<T> {
    mode: 'create' | 'edit' | 'delete'
    item?: T
    onSave: (data: any) => Promise<any>
    loading?: boolean
    children?: React.ReactNode
    title: string
    fields?: Array<{
        key: string
        label: string
        type?: 'text' | 'number'
        required?: boolean
    }>
}

export function CrudDialog<T extends { id?: number; nombre: string }>({
    mode,
    item,
    onSave,
    loading = false,
    children,
    title,
    fields = [{ key: 'nombre', label: 'Nombre', required: true }]
}: CrudDialogProps<T>) {
    const [open, setOpen] = useState(false)
    const [formData, setFormData] = useState<Record<string, any>>(
        item ? { ...item } : {}
    )

    const handleSubmit = async () => {
        if (mode === 'delete') {
            await onSave(item)
        } else {
            // Validate required fields
            const missingFields = fields
                .filter(field => field.required && !formData[field.key])
                .map(field => field.label)

            if (missingFields.length > 0) {
                alert(`Campos requeridos: ${missingFields.join(', ')}`)
                return
            }

            await onSave(formData)
        }
        setOpen(false)
        setFormData({})
    }

    const handleInputChange = (key: string, value: string) => {
        setFormData(prev => ({ ...prev, [key]: value }))
    }

    const getIcon = () => {
        switch (mode) {
            case 'create': return <PlusIcon className="h-4 w-4" />
            case 'edit': return <EditIcon className="h-4 w-4" />
            case 'delete': return <TrashIcon className="h-4 w-4" />
        }
    }

    const getButtonVariant = () => {
        switch (mode) {
            case 'create': return 'default'
            case 'edit': return 'outline'
            case 'delete': return 'destructive'
        }
    }

    const getButtonText = () => {
        switch (mode) {
            case 'create': return 'Crear'
            case 'edit': return 'Editar'
            case 'delete': return 'Eliminar'
        }
    }

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                {children || (
                    <Button variant={getButtonVariant()} size="sm">
                        {getIcon()}
                        {getButtonText()}
                    </Button>
                )}
            </DialogTrigger>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>{title}</DialogTitle>
                </DialogHeader>

                {mode === 'delete' ? (
                    <div className="py-4">
                        <p>¿Estás seguro de que quieres eliminar <strong>{item?.nombre}</strong>?</p>
                        <p className="text-sm text-gray-500 mt-2">Esta acción no se puede deshacer.</p>
                    </div>
                ) : (
                    <div className="grid gap-4 py-4">
                        {fields.map(field => (
                            <div key={field.key} className="grid grid-cols-4 items-center gap-4">
                                <Label htmlFor={field.key} className="text-right">
                                    {field.label} {field.required && '*'}
                                </Label>
                                <Input
                                    id={field.key}
                                    type={field.type || 'text'}
                                    value={formData[field.key] || ''}
                                    onChange={(e) => handleInputChange(field.key, e.target.value)}
                                    className="col-span-3"
                                    placeholder={`Ingresa ${field.label.toLowerCase()}`}
                                />
                            </div>
                        ))}
                    </div>
                )}

                <DialogFooter>
                    <Button variant="outline" onClick={() => setOpen(false)} disabled={loading}>
                        Cancelar
                    </Button>
                    <Button
                        variant={mode === 'delete' ? 'destructive' : 'default'}
                        onClick={handleSubmit}
                        disabled={loading}
                        className="flex items-center gap-2"
                    >
                        {loading && <Spinner size="sm" />}
                        {mode === 'delete' ? 'Eliminar' : 'Guardar'}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}
