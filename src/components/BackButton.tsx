import { Button } from '@/components/ui/button'
import { ChevronLeft } from 'lucide-react'
import { useNavigate } from 'react-router-dom'

interface BackButtonProps {
    to?: string
    state?: any
    className?: string
}

export function BackButton({ to, state, className = '' }: BackButtonProps) {
    const navigate = useNavigate()

    const handleClick = () => {
        console.log('BackButton clicked', { to, state })
        if (to) {
            navigate(to, { state })
        } else {
            navigate(-1)
        }
    }

    return (
        <Button
            className={`absolute left-4 top-4 rounded-full size-10 border-2 z-50 pointer-events-auto ${className}`}
            variant='outline'
            onClick={handleClick}
        >
            <ChevronLeft className='size-6 text-zinc-300' />
        </Button>
    )
}
