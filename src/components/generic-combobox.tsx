"use client"

import { Button } from '@/components/ui/button'
import { CheckIcon, ChevronsUpDownIcon } from 'lucide-react'
import { useState } from 'react'
import { cn } from "@/lib/utils"
import {
    Command,
    CommandEmpty,
    CommandGroup,
    CommandInput,
    CommandItem,
    CommandList,
} from "@/components/ui/command"
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover"

interface ComboboxItem {
    id: number
    nombre: string
}

interface GenericComboboxProps<T extends ComboboxItem> {
    value: string
    onValueChange: (value: string) => void
    items: T[]
    placeholder: string
    searchPlaceholder: string
    emptyMessage: string
    disabled?: boolean
}

export function GenericCombobox<T extends ComboboxItem>({
    value,
    onValueChange,
    items,
    placeholder,
    searchPlaceholder,
    emptyMessage,
    disabled = false
}: GenericComboboxProps<T>) {
    const [open, setOpen] = useState(false)

    return (
        <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
                <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={open}
                    disabled={disabled}
                    className="w-full justify-between"
                >
                    {value
                        ? items.find((item) => item.id.toString() === value)?.nombre
                        : placeholder}
                    <ChevronsUpDownIcon className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
            </PopoverTrigger>
            <PopoverContent className="w-full p-0">
                <Command>
                    <CommandInput placeholder={searchPlaceholder} />
                    <CommandList>
                        <CommandEmpty>{emptyMessage}</CommandEmpty>
                        <CommandGroup>
                            {items.map((item) => (
                                <CommandItem
                                    key={item.id}
                                    value={item.id.toString()}
                                    onSelect={(currentValue) => {
                                        onValueChange(currentValue === value ? "" : currentValue)
                                        setOpen(false)
                                    }}
                                >
                                    <CheckIcon
                                        className={cn(
                                            "mr-2 h-4 w-4",
                                            value === item.id.toString() ? "opacity-100" : "opacity-0"
                                        )}
                                    />
                                    {item.nombre}
                                </CommandItem>
                            ))}
                        </CommandGroup>
                    </CommandList>
                </Command>
            </PopoverContent>
        </Popover>
    )
}

export type { ComboboxItem }
