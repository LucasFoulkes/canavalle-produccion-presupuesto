import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { VariedadAmountDialog } from '@/components/VariedadAmountDialog'
import { AccionesService } from '@/services/acciones.service'
import { BloqueVariedadService } from '@/services/bloque-variedad.service'
import { Spinner } from '@/components/ui/spinner'

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

interface VariedadButtonWithValueProps {
    finca: Finca
    bloque: Bloque
    variedad: Variedad
    accion: string
    onValueChange?: () => void
}

export function VariedadButtonWithValue({
    finca,
    bloque,
    variedad,
    accion,
    onValueChange
}: VariedadButtonWithValueProps) {
    const [currentValue, setCurrentValue] = useState<number>(0)
    const [loading, setLoading] = useState(true)

    const fetchCurrentValue = async () => {
        setLoading(true)
        try {
            // Get or create bloque_variedad relationship
            const { data: bloqueVariedad, error: relationError } = await BloqueVariedadService.getOrCreateBloqueVariedad(
                bloque.id,
                variedad.id
            )

            if (relationError || !bloqueVariedad) {
                console.error('Error getting bloque_variedad relationship:', relationError)
                setCurrentValue(0)
                setLoading(false)
                return
            }

            // Get latest value for this action
            const { data: valueData, error: valueError } = await AccionesService.getLatestActionValue(
                bloqueVariedad.id,
                accion
            )

            if (valueError) {
                console.error('Error getting latest value:', valueError)
                setCurrentValue(0)
            } else {
                setCurrentValue(valueData?.value || 0)
            }
        } catch (error) {
            console.error('Unexpected error:', error)
            setCurrentValue(0)
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        fetchCurrentValue()
    }, [bloque.id, variedad.id, accion])

    const handleValueUpdate = () => {
        // Refresh the value after update
        fetchCurrentValue()
        // Call parent callback if provided
        if (onValueChange) {
            onValueChange()
        }
    }

    return (
        <VariedadAmountDialog
            finca={finca}
            bloque={bloque}
            variedad={variedad}
            accion={accion}
            onValueUpdate={handleValueUpdate}
        >            <Button className="w-full h-18 text-lg flex justify-between items-center px-4">
                <span className="capitalize text-left">{variedad.nombre}</span>                <span className="font-bold text-xl">
                    {loading ? <Spinner size="sm" /> : currentValue}
                </span>
            </Button>
        </VariedadAmountDialog>
    )
}
