import { Button } from '@/components/ui/button'

interface ActionButtonProps {
    action: string
    variant?: 'screen' | 'full'
    className?: string
}

export function ActionButton({ action, variant = 'screen', className = '' }: ActionButtonProps) {
    const baseClasses = 'bg-blue-600 text-white font-semibold text-lg'

    const variantClasses = {
        screen: 'w-screen rounded-none mt-2 uppercase',
        full: 'w-full h-14 capitalize'
    }

    const displayText = action.replace(/_/g, ' ')

    return (
        <Button
            className={`${baseClasses} ${variantClasses[variant]} ${className}`}
            disabled
        >
            {displayText}
        </Button>
    )
}
