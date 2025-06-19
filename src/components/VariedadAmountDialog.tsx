import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { ActionButton } from '@/components/ActionButton'
import { useState } from 'react'

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
}

export function VariedadAmountDialog({
    finca,
    bloque,
    variedad,
    accion,
    children
}: VariedadAmountDialogProps) {
    const [amount, setAmount] = useState('')
    const [open, setOpen] = useState(false)

    const handleConfirm = () => {
        if (!amount || parseFloat(amount) <= 0) {
            return
        }

        const data = {
            finca: finca.nombre,
            bloque: bloque.nombre,
            variedad: variedad.nombre,
            accion: accion,
            amount: parseFloat(amount)
        }

        setAmount('')
        setOpen(false)
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
            <DialogContent>
                <DialogHeader>
                    <DialogTitle className="text-center capitalize text-xl font-bold">
                        {finca.nombre} • {bloque.nombre} • {variedad.nombre}
                    </DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                    <ActionButton action={accion} />
                    <Input
                        id="amount"
                        type="number"
                        value={amount}
                        onChange={(e) => setAmount(e.target.value)}
                        className="text-lg h-14 text-center"
                        placeholder='Ingrese la cantidad'
                        autoFocus
                    />
                </div>

                <DialogFooter className="flex-col space-y-2">
                    <Button
                        onClick={handleConfirm}
                        disabled={!amount || parseFloat(amount) <= 0}
                        className="w-full h-14 text-lg"
                    >
                        Confirmar
                    </Button>
                    <Button
                        variant="destructive"
                        onClick={handleCancel}
                        className="w-full h-14 text-lg"
                    >
                        Cancelar
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}
