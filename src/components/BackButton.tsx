import { useNavigate } from 'react-router-dom';
import { CircleChevronLeft } from 'lucide-react';

export function BackButton({ to }: { to?: string }) {
    const navigate = useNavigate();

    return (
        <div className='absolute right-4 top-0 bottom-0 flex'
            onClick={() => to ? navigate(to) : navigate(-1)}
        >
            <CircleChevronLeft className='h-full w-full stroke-1 opacity-10' />
        </div>
    );
}