/**
 * Centralized schema and constants for the application
 * Single source of truth for data structures and mappings
 */

// Base types
export interface BaseItem {
    id: string;
    nombre: string;
}

export interface AccionItem extends BaseItem {
    completionStatus?: CompletionStatus;
}

export type CompletionStatus = 'empty' | 'partial' | 'complete';

// Action definitions with metadata
export const ACCIONES_CONFIG = {
    'produccion-real': {
        nombre: 'PRODUCCION REAL',
        columns: ['produccion_real'],
        type: 'per-variedad' as const
    },
    'pinche-apertura': {
        nombre: 'PINCHE DE APERTURA',
        columns: ['pinche_apertura'],
        type: 'per-variedad' as const
    },
    'pinche-sanitario': {
        nombre: 'PINCHE SANITARIO',
        columns: ['pinche_sanitario'],
        type: 'per-variedad' as const
    },
    'pinche-tierno': {
        nombre: 'PINCHE EN TIERNO',
        columns: ['pinche_tierno'],
        type: 'per-variedad' as const
    },
    'clima': {
        nombre: 'CLIMA',
        columns: ['temperatura', 'humedad'],
        type: 'per-bloque' as const
    },
    'arveja': {
        nombre: 'ARVEJA',
        columns: ['arveja'],
        type: 'per-variedad' as const
    },
    'garbanzo': {
        nombre: 'GARBANZO',
        columns: ['garbanzo'],
        type: 'per-variedad' as const
    },
    'uva': {
        nombre: 'UVA',
        columns: ['uva'],
        type: 'per-variedad' as const
    }
} as const;

export type AccionId = keyof typeof ACCIONES_CONFIG;

// Derived constants for backward compatibility
export const ACCIONES_ITEMS: AccionItem[] = Object.entries(ACCIONES_CONFIG).map(
    ([id, config]) => ({ id, nombre: config.nombre })
);

export const COLUMN_MAPPING: Record<string, string[]> = Object.fromEntries(
    Object.entries(ACCIONES_CONFIG).map(([id, config]) => [id, [...config.columns]])
);

// Single column mapping for useSupabase (first column only)
export const SINGLE_COLUMN_MAPPING: Record<string, string> = Object.fromEntries(
    Object.entries(ACCIONES_CONFIG).map(([id, config]) => [id, config.columns[0]])
);

// Utility functions
export const isPerBloque = (accionId: string): boolean =>
    ACCIONES_CONFIG[accionId as AccionId]?.type === 'per-bloque';

export const getAccionConfig = (accionId: string) =>
    ACCIONES_CONFIG[accionId as AccionId];
