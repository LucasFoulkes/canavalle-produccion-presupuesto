"use client"

import * as React from 'react'
import { cn } from '@/lib/utils'

export type ScrollContainerProps = React.HTMLAttributes<HTMLDivElement>

export function ScrollContainer({ className, ...props }: ScrollContainerProps) {
    return (
        <div
            className={cn(
                "overflow-auto [scrollbar-width:thin] [scrollbar-color:rgba(100,100,100,0.25)_transparent] [--sb-size:10px] [&::-webkit-scrollbar]:w-[var(--sb-size)] [&::-webkit-scrollbar]:h-[var(--sb-size)] [&::-webkit-scrollbar-thumb]:bg-[rgba(100,100,100,0.25)] [&::-webkit-scrollbar-thumb]:rounded-lg [&::-webkit-scrollbar-thumb]:border-2 [&::-webkit-scrollbar-thumb]:border-transparent [&::-webkit-scrollbar-thumb]:bg-clip-padding",
                className
            )}
            {...props}
        />
    )
}

export default ScrollContainer
