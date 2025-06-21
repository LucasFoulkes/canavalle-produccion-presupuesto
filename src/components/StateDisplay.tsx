import { Spinner } from '@/components/ui/spinner'

interface StateDisplayProps {
    message: string
    type: 'loading' | 'error' | 'empty'
}

export function StateDisplay({ message, type }: StateDisplayProps) {
    const getMessageClass = () => {
        switch (type) {
            case 'error':
                return 'text-red-500'
            case 'empty':
                return 'text-gray-500'
            default:
                return 'text-gray-700'
        }
    }

    return (
        <div className="flex flex-col p-4 gap-4 h-screen">
            <div className='flex flex-col flex-grow justify-center items-center w-full'>
                {type === 'loading' && <Spinner size="lg" className="mb-4" />}
                <p className={getMessageClass()}>{message}</p>
            </div>
        </div>
    )
}
