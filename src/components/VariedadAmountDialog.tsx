import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { ActionBadge } from '@/components/ActionBadge'
import { useState } from 'react'
import { BloqueVariedadService } from '@/services/bloque-variedad.service'
import { AccionesService } from '@/services/acciones.service'

interface Finca {
    id: number;
    nombre: string;
}

interface Bloque {
    id: number;
    nombre: string;
    finca_id: number;
}

interface Variedad {
    id: number;
    nombre: string;
}

interface VariedadAmountDialogProps {
    finca: Finca;
    bloque: Bloque;
    variedad: Variedad;
    accion: string;
    children: React.ReactNode;
    onValueUpdate?: () => void; // Callback to refresh the button value
}

export function VariedadAmountDialog({
    finca,
    bloque,
    variedad,
    accion,
    children,
    onValueUpdate
}: VariedadAmountDialogProps) {
    const [amount, setAmount] = useState('')
    const [open, setOpen] = useState(false)
    const [isLoading, setIsLoading] = useState(false)

    const handleConfirm = async () => {
        if (!amount || parseFloat(amount) < 0 || isNaN(parseFloat(amount))) {
            return
        }

        setIsLoading(true)

        try {
            // Get or create the bloque_variedad relationship
            const { data: bloqueVariedad, error: relationError } = await BloqueVariedadService.getOrCreateBloqueVariedad(
                bloque.id,
                variedad.id
            )

            if (relationError || !bloqueVariedad) {
                console.error('Error getting/creating bloque_variedad relationship:', relationError)
                setIsLoading(false)
                return
            }

            console.log('Got bloque_variedad_id:', bloqueVariedad.id, 'for bloque:', bloque.id, 'variedad:', variedad.id, 'action:', accion)

            // Create or update today's entry in acciones table
            const { data: savedAccion, error: saveError } = await AccionesService.createOrUpdateTodayAccion(
                bloqueVariedad.id,
                accion,
                parseFloat(amount)
            )

            if (saveError) {
                console.error('Error saving/updating accion:', saveError)
            } else {
                console.log('Accion saved/updated successfully:', savedAccion)
                // Call the callback to update the button value
                if (onValueUpdate) {
                    onValueUpdate()
                }
            }

        } catch (error) {
            console.error('Unexpected error:', error)
        } finally {
            setIsLoading(false)
            setAmount('')
            setOpen(false)
        }
    }

    const handleCancel = () => {
        setAmount('')
        setOpen(false)
    }

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                {children}
            </DialogTrigger>
            <DialogContent className="flex flex-col gap-4">
                <DialogHeader>
                    <DialogTitle className="text-center capitalize text-xl font-bold">
                        {finca.nombre} • {bloque.nombre} • {variedad.nombre}
                    </DialogTitle>
                </DialogHeader>

                <div className="flex-1 flex flex-col items-center justify-center gap-4">
                    <ActionBadge action={accion} />
                    <Input
                        id="amount"
                        type="number"
                        value={amount}
                        onChange={(e) => setAmount(e.target.value)}
                        className="text-lg h-14 text-center w-full"
                        placeholder='Ingrese la cantidad'
                        autoFocus
                    />
                </div>                <DialogFooter className="flex flex-col gap-2">
                    <Button
                        onClick={handleConfirm}
                        disabled={!amount || parseFloat(amount) < 0 || isNaN(parseFloat(amount)) || isLoading}
                        className="w-full h-14 text-lg"
                    >
                        {isLoading ? 'Guardando...' : 'Confirmar'}
                    </Button>
                    <Button
                        variant="destructive"
                        onClick={handleCancel}
                        disabled={isLoading}
                        className="w-full h-14 text-lg"
                    >
                        Cancelar
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}
