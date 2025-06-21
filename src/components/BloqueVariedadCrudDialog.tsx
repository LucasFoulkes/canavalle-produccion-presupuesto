import { useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Spinner } from '@/components/ui/spinner'
import { PlusIcon, EditIcon, TrashIcon } from 'lucide-react'
import { Select, SelectContent, SelectItem, SelectValue } from '@/components/ui/select'

interface BloqueVariedadCrudDialogProps {
    mode: 'create' | 'edit' | 'delete'
    item?: any
    onSave: (data: any) => Promise<any>
    loading?: boolean
    children?: React.ReactNode
    title: string
    bloques: Array<{ id: number; nombre: string; finca_nombre: string }>
    variedades: Array<{ id: number; nombre: string }>
}

export function BloqueVariedadCrudDialog({
    mode,
    item,
    onSave,
    loading = false,
    children,
    title,
    bloques,
    variedades
}: BloqueVariedadCrudDialogProps) {
    const [open, setOpen] = useState(false)
    const [formData, setFormData] = useState<{ bloque_id?: number; variedad_id?: number }>(
        item ? { bloque_id: item.bloque_id, variedad_id: item.variedad_id } : {}
    )

    const handleSubmit = async () => {
        if (mode === 'delete') {
            await onSave(item)
        } else {
            // Validate required fields
            if (!formData.bloque_id || !formData.variedad_id) {
                alert('Debe seleccionar un bloque y una variedad')
                return
            }

            await onSave(formData)
        }
        setOpen(false)
        setFormData({})
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
                        <p>¿Estás seguro de que quieres eliminar esta relación?</p>
                        <p className="text-sm text-gray-500 mt-2">
                            <strong>Bloque:</strong> {item?.bloque_nombre}<br />
                            <strong>Variedad:</strong> {item?.variedad_nombre}
                        </p>
                        <p className="text-sm text-gray-500 mt-2">Esta acción no se puede deshacer.</p>
                    </div>
                ) : (
                    <div className="grid gap-4 py-4">
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="bloque" className="text-right">
                                Bloque *
                            </Label>                            <Select
                                value={formData.bloque_id?.toString() || ''}
                                onValueChange={(value: string) => setFormData(prev => ({ ...prev, bloque_id: parseInt(value) }))}
                            >
                                <SelectValue placeholder="Selecciona un bloque" />
                                <SelectContent>
                                    {bloques.map(bloque => (
                                        <SelectItem key={bloque.id} value={bloque.id.toString()}>
                                            {bloque.nombre} ({bloque.finca_nombre})
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="variedad" className="text-right">
                                Variedad *
                            </Label>                            <Select
                                value={formData.variedad_id?.toString() || ''}
                                onValueChange={(value: string) => setFormData(prev => ({ ...prev, variedad_id: parseInt(value) }))}
                            >
                                <SelectValue placeholder="Selecciona una variedad" />
                                <SelectContent>
                                    {variedades.map(variedad => (
                                        <SelectItem key={variedad.id} value={variedad.id.toString()}>
                                            {variedad.nombre}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
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
