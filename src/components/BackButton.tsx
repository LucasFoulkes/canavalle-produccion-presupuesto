import { ChevronLeft } from 'lucide-react'
import { useNavigate } from 'react-router-dom';
import { Button } from './ui/button';

export function BackButton({ to, state }: { to?: string; state?: any }) {
    const navigate = useNavigate();

    return (<Button
        variant="outline"
        className={'absolute right-4 top-4 rounded-full size-16 border-2 z-10'}
        onClick={() => to ? navigate(to, { state }) : navigate(-1)}
    >
        <ChevronLeft className='size-10 text-zinc-300' />
    </Button>
    );
}