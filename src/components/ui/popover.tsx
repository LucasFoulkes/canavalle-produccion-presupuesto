import * as React from "react"
import { createPortal } from "react-dom"
import { cn } from "@/lib/utils"

type PopoverContextValue = {
  open: boolean
  setOpen: (v: boolean) => void
  triggerRef: React.RefObject<HTMLElement | null>
}

const PopoverCtx = React.createContext<PopoverContextValue | null>(null)

function Popover({
  open: controlledOpen,
  defaultOpen,
  onOpenChange,
  ...props
}: {
  open?: boolean
  defaultOpen?: boolean
  onOpenChange?: (open: boolean) => void
} & React.HTMLAttributes<HTMLDivElement>) {
  const [uncontrolledOpen, setUncontrolledOpen] = React.useState<boolean>(defaultOpen ?? false)
  const isControlled = controlledOpen !== undefined
  const open = isControlled ? !!controlledOpen : uncontrolledOpen
  const setOpen = (v: boolean) => {
    if (!isControlled) setUncontrolledOpen(v)
    onOpenChange?.(v)
  }
  const triggerRef = React.useRef<HTMLElement | null>(null)
  return (
    <PopoverCtx.Provider value={{ open, setOpen, triggerRef }}>
      <div data-slot="popover" {...props} />
    </PopoverCtx.Provider>
  )
}

function PopoverTrigger({
  asChild,
  ...props
}: { asChild?: boolean } & React.HTMLAttributes<HTMLElement>) {
  const ctx = React.useContext(PopoverCtx)
  if (!ctx) return null
  const { open, setOpen, triggerRef } = ctx
  const Comp: any = asChild ? (React.Children.only as any)(props.children).type : 'button'
  const childProps = asChild ? (React.Children.only as any)(props.children).props : {}
  return (
    <Comp
      data-slot="popover-trigger"
      aria-expanded={open}
      {...childProps}
      {...(!asChild ? props : {})}
      ref={triggerRef as any}
      onClick={(e: any) => {
        childProps?.onClick?.(e)
          ; (props as any)?.onClick?.(e)
        setOpen(!open)
      }}
    >
      {asChild ? childProps.children : props.children}
    </Comp>
  )
}

function usePortalContainer() {
  const [el] = React.useState(() => {
    const div = document.createElement('div')
    div.className = 'fixed inset-0 z-50 pointer-events-none'
    return div
  })
  React.useEffect(() => {
    document.body.appendChild(el)
    return () => { try { document.body.removeChild(el) } catch { } }
  }, [el])
  return el
}

function PopoverContent({
  className,
  align = "center",
  sideOffset = 4,
  style,
  onOpenAutoFocus,
  ...props
}: {
  className?: string
  align?: 'start' | 'center' | 'end'
  sideOffset?: number
  onOpenAutoFocus?: (e: Event) => void
} & React.HTMLAttributes<HTMLDivElement>) {
  const ctx = React.useContext(PopoverCtx)
  if (!ctx) return null
  const { open, setOpen, triggerRef } = ctx
  const portal = usePortalContainer()
  const [pos, setPos] = React.useState<{ top: number; left: number; width: number }>({ top: 0, left: 0, width: 0 })

  React.useLayoutEffect(() => {
    const el = triggerRef.current
    if (!el) return
    const rect = el.getBoundingClientRect()
    setPos({ top: rect.bottom + sideOffset, left: rect.left, width: rect.width })
  }, [triggerRef, sideOffset, open])

  React.useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      if (!open) return
      const trg = triggerRef.current
      if (trg && e.target instanceof Node && (trg === e.target || trg.contains(e.target as Node))) return
      setOpen(false)
    }
    document.addEventListener('mousedown', onDoc)
    return () => document.removeEventListener('mousedown', onDoc)
  }, [open, setOpen, triggerRef])

  // Call optional onOpenAutoFocus handler when opening, to emulate Radix's API surface
  React.useEffect(() => {
    if (open && typeof onOpenAutoFocus === 'function') {
      try {
        const ev = new Event('openAutoFocus')
          ; (onOpenAutoFocus as any)(ev)
      } catch { }
    }
  }, [open, onOpenAutoFocus])

  if (!open) return null
  const alignClass = align === 'start' ? 'justify-start' : align === 'end' ? 'justify-end' : 'justify-center'
  const content = (
    <div
      data-slot="popover-content"
      className={cn(
        "pointer-events-auto absolute z-50 rounded-md border bg-popover p-4 text-popover-foreground shadow-md",
        alignClass,
        className,
      )}
      style={{ position: 'absolute', top: pos.top, left: pos.left, minWidth: pos.width, ...style }}
      {...props}
    />
  )
  return createPortal(content, portal)
}

function PopoverAnchor(props: React.HTMLAttributes<HTMLDivElement>) {
  return <div data-slot="popover-anchor" {...props} />
}

export { Popover, PopoverTrigger, PopoverContent, PopoverAnchor }
