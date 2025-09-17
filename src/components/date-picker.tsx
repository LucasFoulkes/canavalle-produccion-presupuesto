"use client"
import * as React from 'react'
import { format } from 'date-fns'
import { Calendar as CalendarIcon } from 'lucide-react'
import type { DateRange } from 'react-day-picker'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Calendar } from '@/components/ui/calendar'
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/popover'

export type DatePickerValue = Date | undefined
export type DateRangeValue = DateRange | undefined

export function DatePicker({ value, onChange, placeholder = 'Seleccionar fecha', className, autoCloseOnSelect, onCommit }: {
    value: DatePickerValue
    onChange: (d: DatePickerValue) => void
    placeholder?: string
    className?: string
    autoCloseOnSelect?: boolean
    onCommit?: () => void
}) {
    const [open, setOpen] = React.useState(false)
    return (
        <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
                <Button
                    variant="outline"
                    data-empty={!value}
                    className={cn('data-[empty=true]:text-muted-foreground w-[180px] justify-start text-left font-normal', className)}
                >
                    <CalendarIcon className="mr-2 size-4" />
                    {value ? format(value, 'dd/MM/yyyy') : <span>{placeholder}</span>}
                </Button>
            </PopoverTrigger>
            <PopoverContent
                className="w-auto p-0"
                align="start"
                onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                        // Let DayPicker process selection first (click event after keydown).
                        setTimeout(() => {
                            if (value) {
                                onCommit?.()
                                setOpen(false)
                            }
                        }, 0)
                    }
                }}
            >
                <Calendar
                    mode="single"
                    selected={value}
                    onSelect={(d) => {
                        if (!d) return // ignore clear toggle via keyboard
                        onChange(d)
                        if (autoCloseOnSelect) setOpen(false)
                    }}
                />
            </PopoverContent>
        </Popover>
    )
}

export function DateRangePicker({ value, onChange, placeholder = 'Rango de fechas', className, autoCloseOnSelect, onCommit }: {
    value: DateRangeValue
    onChange: (d: DateRangeValue) => void
    placeholder?: string
    className?: string
    autoCloseOnSelect?: boolean
    onCommit?: () => void
}) {
    const [open, setOpen] = React.useState(false)
    const label = value?.from && value?.to
        ? `${format(value.from, 'dd/MM/yyyy')} – ${format(value.to, 'dd/MM/yyyy')}`
        : value?.from ? format(value.from, 'dd/MM/yyyy') : placeholder
    return (
        <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
                <Button
                    variant="outline"
                    data-empty={!value?.from}
                    className={cn('data-[empty=true]:text-muted-foreground w-[220px] justify-start text-left font-normal', className)}
                >
                    <CalendarIcon className="mr-2 size-4" />
                    {label}
                </Button>
            </PopoverTrigger>
            <PopoverContent
                className="w-auto p-0"
                align="start"
                onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                        setTimeout(() => {
                            if (value.from && value.to) {
                                onCommit?.()
                                setOpen(false)
                            }
                        }, 0)
                    }
                }}
            >
                <Calendar
                    mode="range"
                    selected={value}
                    onSelect={(range) => {
                        onChange(range ?? {})
                        if (autoCloseOnSelect && range?.from && range?.to) setOpen(false)
                    }}
                    numberOfMonths={1}
                />
            </PopoverContent>
        </Popover>
    )
}

export function toISODate(d?: Date) {
    if (!d) return ''
    const y = d.getUTCFullYear(); const m = String(d.getUTCMonth() + 1).padStart(2, '0'); const da = String(d.getUTCDate()).padStart(2, '0')
    return `${y}-${m}-${da}`
}
