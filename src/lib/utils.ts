import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// --- Date formatting helpers ---
// Display format requested: DD/MM/YYYY (always using UTC components to avoid TZ drift)
export function formatDate(value: any): string {
  if (!value) return ''
  const d = new Date(value)
  if (isNaN(d.getTime())) return ''
  const y = d.getUTCFullYear()
  const m = String(d.getUTCMonth() + 1).padStart(2, '0')
  const day = String(d.getUTCDate()).padStart(2, '0')
  return `${day}/${m}/${y}`
}

// Canonical ISO (YYYY-MM-DD) if ever needed for stable lexical sorting
export function formatDateISO(value: any): string {
  if (!value) return ''
  const d = new Date(value)
  if (isNaN(d.getTime())) return ''
  const y = d.getUTCFullYear()
  const m = String(d.getUTCMonth() + 1).padStart(2, '0')
  const day = String(d.getUTCDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

export function formatDateRange(from?: any, to?: any): string {
  const aISO = formatDateISO(from)
  const bISO = formatDateISO(to)
  if (!aISO && !bISO) return ''
  if (aISO && bISO && aISO !== bISO) {
    // Convert each back to display format
    return `${formatDate(from)} – ${formatDate(to)}`
  }
  return formatDate(from) || formatDate(to)
}

// Detect probable date/time column keys for generic tables
export function isDateLikeKey(key: string): boolean {
  return /(fecha|creado_en|actualizado_en|eliminado_en|modificado_en)$/i.test(key)
}
