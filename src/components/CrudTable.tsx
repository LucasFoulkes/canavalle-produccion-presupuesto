import { useState, useEffect } from 'react'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Spinner } from '@/components/ui/spinner'
import { StateDisplay } from '@/components/StateDisplay'
import { PlusIcon, EditIcon, TrashIcon } from 'lucide-react'

interface TableColumn<T> {
    key: keyof T | string
    label: string
    render?: (item: T) => React.ReactNode
}

interface FormField {
    key: string
    label: string
    type?: 'text' | 'number' | 'select'
    required?: boolean
    options?: Array<{ value: string | number; label: string }>
}

interface CrudTableProps<T extends { id: number }> {
    title: string
    data: T[]
    columns: TableColumn<T>[]
    formFields: FormField[]
    loading?: boolean
    error?: string | null
    isEmpty?: boolean
    emptyMessage?: string
    loadingMessage?: string
    onCreate: (data: any) => Promise<any>
    onUpdate: (id: number, data: any) => Promise<any>
    onDelete: (id: number) => Promise<any>
    crudLoading?: boolean
}

function CrudDialog<T extends { id: number }>({
    mode,
    item,
    onSave,
    loading = false,
    title,
    fields,
    open,
    setOpen
}: {
    mode: 'create' | 'edit' | 'delete'
    item?: T
    onSave: (data: any) => Promise<any>
    loading?: boolean
    title: string
    fields: FormField[]
    open: boolean
    setOpen: (open: boolean) => void
}) {
    const [formData, setFormData] = useState<Record<string, any>>({})

    // Reset form data when item or mode changes
    useEffect(() => {
        if (mode === 'create') {
            setFormData({})
        } else if (mode === 'edit' && item) {
            setFormData({ ...item })
        }
    }, [mode, item])

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

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>{title}</DialogTitle>
                </DialogHeader>

                {mode === 'delete' ? (
                    <div className="py-4">
                        <p>¿Estás seguro de que quieres eliminar este elemento?</p>
                        <p className="text-sm text-gray-500 mt-2">Esta acción no se puede deshacer.</p>
                    </div>
                ) : (
                    <div className="grid gap-4 py-4">
                        {fields.map(field => (
                            <div key={field.key} className="grid grid-cols-4 items-center gap-4">
                                <Label htmlFor={field.key} className="text-right">
                                    {field.label} {field.required && '*'}
                                </Label>
                                {field.type === 'select' ? (
                                    <select
                                        id={field.key}
                                        value={formData[field.key] || ''}
                                        onChange={(e) => handleInputChange(field.key, e.target.value)}
                                        className="col-span-3 flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                                    >
                                        <option value="">Seleccionar...</option>
                                        {field.options?.map(option => (
                                            <option key={option.value} value={option.value}>
                                                {option.label}
                                            </option>
                                        ))}
                                    </select>
                                ) : (
                                    <Input
                                        id={field.key}
                                        type={field.type || 'text'}
                                        value={formData[field.key] || ''}
                                        onChange={(e) => handleInputChange(field.key, e.target.value)}
                                        className="col-span-3"
                                        placeholder={`Ingresa ${field.label.toLowerCase()}`}
                                    />
                                )}
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

export function CrudTable<T extends { id: number }>({
    title,
    data,
    columns,
    formFields,
    loading = false,
    error = null,
    isEmpty = false,
    emptyMessage = "No hay datos disponibles",
    loadingMessage = "Cargando...",
    onCreate,
    onUpdate,
    onDelete,
    crudLoading = false
}: CrudTableProps<T>) {    const [dialogMode, setDialogMode] = useState<'create' | 'edit' | 'delete' | null>(null)
    const [selectedItem, setSelectedItem] = useState<T | null>(null)
    const [dialogOpen, setDialogOpen] = useState(false)

    const handleCreate = () => {
        setSelectedItem(null)
        setDialogMode('create')
        setDialogOpen(true)
    }

    const handleEdit = (item: T) => {
        setSelectedItem(item)
        setDialogMode('edit')
        setDialogOpen(true)
    }

    const handleDelete = (item: T) => {
        setSelectedItem(item)
        setDialogMode('delete')
        setDialogOpen(true)
    }

    const handleSave = async (data: any) => {
        try {
            if (dialogMode === 'create') {
                // For create operations, exclude the 'id' field since it's auto-generated
                const { id, ...createData } = data
                await onCreate(createData)
            } else if (dialogMode === 'edit' && selectedItem) {
                // For edit operations, exclude the 'id' field from the update data
                const { id, ...updateData } = data
                await onUpdate(selectedItem.id, updateData)
            } else if (dialogMode === 'delete' && selectedItem) {
                await onDelete(selectedItem.id)
            }
        } catch (error) {
            console.error('CRUD operation failed:', error)
            alert('Error al realizar la operación')
        }
    }

    const getDialogTitle = () => {
        switch (dialogMode) {
            case 'create': return `Crear ${title.slice(0, -1)}`
            case 'edit': return `Editar ${title.slice(0, -1)}`
            case 'delete': return `Eliminar ${title.slice(0, -1)}`
            default: return ''
        }
    }

    // Show loading state
    if (loading) {
        return <StateDisplay message={loadingMessage} type="loading" />
    }

    // Show error state
    if (error) {
        return <StateDisplay message={`Error: ${error}`} type="error" />
    }

    // Show empty state
    if (isEmpty || data.length === 0) {
        return (
            <div className="flex flex-col h-full space-y-4">
                <div className="flex justify-between items-center">
                    <h3 className="text-lg font-semibold">{title} (0)</h3>
                    <Button onClick={handleCreate} className="flex items-center gap-2">
                        <PlusIcon className="h-4 w-4" />
                        Crear
                    </Button>
                </div>
                <StateDisplay message={emptyMessage} type="empty" />
            </div>
        )
    }

    return (
        <div className="flex flex-col h-full space-y-4">
            <div className="flex justify-between items-center">
                <h3 className="text-lg font-semibold">{title} ({data.length})</h3>
                <Button onClick={handleCreate} className="flex items-center gap-2">
                    <PlusIcon className="h-4 w-4" />
                    Crear
                </Button>
            </div>

            <div className="flex flex-col flex-1 border rounded-md">
                {/* Fixed Header */}
                <Table className="text-xs">
                    <TableHeader className="bg-gray-50">
                        <TableRow>
                            {columns.map((column, index) => (
                                <TableHead key={index} className="text-center">
                                    {column.label}
                                </TableHead>
                            ))}
                            <TableHead className="text-center">Acciones</TableHead>
                        </TableRow>
                    </TableHeader>
                </Table>

                {/* Scrollable Body */}
                <div className="flex-1 overflow-y-auto">
                    <Table className="text-xs">
                        <TableBody>
                            {data.map((item) => (
                                <TableRow key={item.id}>
                                    {columns.map((column, colIndex) => (
                                        <TableCell key={colIndex} className="capitalize">
                                            {column.render
                                                ? column.render(item)
                                                : String((item as any)[column.key] || '')}
                                        </TableCell>
                                    ))}
                                    <TableCell>
                                        <div className="flex gap-1 justify-center">
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                onClick={() => handleEdit(item)}
                                                className="h-6 w-6 p-0"
                                            >
                                                <EditIcon className="h-3 w-3" />
                                            </Button>
                                            <Button
                                                variant="destructive"
                                                size="sm"
                                                onClick={() => handleDelete(item)}
                                                className="h-6 w-6 p-0"
                                            >
                                                <TrashIcon className="h-3 w-3" />
                                            </Button>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </div>
            </div>

            {/* CRUD Dialog */}
            {dialogMode && (<CrudDialog
                mode={dialogMode}
                item={selectedItem || undefined}
                onSave={handleSave}
                loading={crudLoading}
                title={getDialogTitle()}
                fields={formFields}
                open={dialogOpen}
                setOpen={setDialogOpen}
            />
            )}
        </div>
    )
}
