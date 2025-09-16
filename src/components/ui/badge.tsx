import * as React from 'react'
import { cn } from '@/lib/utils'

export interface BadgeProps extends React.HTMLAttributes<HTMLDivElement> {
    variant?: 'default' | 'outline'
}

export function Badge({ className, variant = 'default', ...props }: BadgeProps) {
    return (
        <div
            data-variant={variant}
            className={cn(
                'inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-medium',
                'bg-primary/10 text-primary border-primary/20 data-[variant=outline]:bg-transparent data-[variant=outline]:text-foreground data-[variant=outline]:border-border',
                className,
            )}
            {...props}
        />
    )
}
