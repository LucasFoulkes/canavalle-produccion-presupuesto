"use client"

import * as React from 'react'
import { CheckIcon, ChevronsUpDownIcon, Search as SearchIcon } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'

export type ComboOption = {
    label: string
    value: string
    group?: string
    icon?: React.ReactNode
    keywords?: string[]
    url?: string
}

export type ComboboxProps = {
    options: ComboOption[]
    onSelect: (option: ComboOption) => void
    placeholder?: string
    emptyText?: string
    className?: string
    autoFocus?: boolean
}

export function Combobox({
    options,
    onSelect,
    placeholder = 'Buscar…',
    emptyText = 'Sin resultados',
    className,
}: ComboboxProps) {
    const [open, setOpen] = React.useState(false)
    const [value, setValue] = React.useState<string>("")

    // Group options by group label
    const grouped = React.useMemo(() => {
        const map = new Map<string, ComboOption[]>()
        for (const opt of options) {
            const key = opt.group ?? 'General'
            if (!map.has(key)) map.set(key, [])
            map.get(key)!.push(opt)
        }
        return Array.from(map.entries())
    }, [options])

    const selectValue = (currentValue: string) => {
        const opt = options.find(o => o.value === currentValue)
        if (opt) {
            setValue(currentValue)
            setOpen(false)
            onSelect(opt)
        }
    }

    return (
        <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
                <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={open}
                    className={cn("w-full justify-between", className)}
                >
                    <span className="flex items-center gap-2 font-normal">
                        <SearchIcon className="h-4 w-4 opacity-60" />
                        {value
                            ? options.find((o) => o.value === value)?.label
                            : placeholder}
                    </span>
                    <ChevronsUpDownIcon className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
            </PopoverTrigger>
            <PopoverContent align="start" className="p-0">
                <Command>
                    <CommandInput placeholder={placeholder} />
                    <CommandList>
                        <CommandEmpty>{emptyText}</CommandEmpty>
                        {grouped.map(([group, list]) => (
                            <CommandGroup key={group} heading={group}>
                                {list.map((opt) => (
                                    <CommandItem
                                        key={`${group}:${opt.value}`}
                                        value={opt.value}
                                        keywords={[opt.label, opt.group ?? '', ...(opt.keywords ?? [])]}
                                        onSelect={selectValue}
                                    >
                                        <CheckIcon
                                            className={cn(
                                                "mr-2 h-4 w-4",
                                                value === opt.value ? "opacity-100" : "opacity-0"
                                            )}
                                        />
                                        {opt.label}
                                    </CommandItem>
                                ))}
                            </CommandGroup>
                        ))}
                    </CommandList>
                </Command>
            </PopoverContent>
        </Popover>
    )
}

export default Combobox
