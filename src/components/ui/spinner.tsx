interface SpinnerProps {
    size?: 'sm' | 'md' | 'lg'
    className?: string
}

export function Spinner({ size = 'md', className = '' }: SpinnerProps) {
    const sizeClasses = {
        sm: 'h-4 w-4',
        md: 'h-5 w-5',
        lg: 'h-8 w-8'
    }

    return (
        <div className={`animate-spin rounded-full border-b-2 border-current ${sizeClasses[size]} ${className}`}></div>
    )
}
