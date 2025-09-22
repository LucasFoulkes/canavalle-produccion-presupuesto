import { EngineFailure, HarvestAggregateArgs, Tool, ToolArgs, ForecastStageArgs, GpsPointsArgs } from './types'

export type ToolSpec<T extends ToolArgs> = {
    tool: Tool
    required: (keyof T)[]
    defaults?: Partial<T>
    validate: (args: any) => { ok: true; args: T } | EngineFailure
}

function fail(code: EngineFailure['code'], message: string, logs: any): EngineFailure {
    return { ok: false, code, message, logs }
}

export const HarvestAggregate: ToolSpec<HarvestAggregateArgs> = {
    tool: 'harvest.aggregate',
    required: ['metric'],
    defaults: {
        metric: 'cosecha',
        group_by: ['variedad'],
        order: 'desc',
    },
    validate(args: any) {
        const logs: any = { stage: 'validate.harvest.aggregate', input: args }
        if (!args || args.metric !== 'cosecha') {
            return fail('SCHEMA_INVALID', 'metric debe ser "cosecha"', { ...logs })
        }
        const out: HarvestAggregateArgs = {
            metric: 'cosecha',
            grain: args.grain,
            group_by: args.group_by,
            filters: args.filters,
            order: args.order,
            top_k: args.top_k,
        }
        if (out.grain && !['day', 'week', 'month'].includes(out.grain)) {
            return fail('SCHEMA_INVALID', 'grain inválido', { ...logs })
        }
        if (out.group_by && out.group_by.some((g) => !['variedad', 'finca', 'bloque', 'cama'].includes(g))) {
            return fail('SCHEMA_INVALID', 'group_by inválido', { ...logs })
        }
        if (out.order && !['asc', 'desc'].includes(out.order)) {
            return fail('SCHEMA_INVALID', 'order inválido', { ...logs })
        }
        if (out.top_k != null && (!(Number.isInteger(out.top_k)) || out.top_k < 1)) {
            return fail('SCHEMA_INVALID', 'top_k inválido', { ...logs })
        }
        return { ok: true, args: out }
    },
}

export const ForecastStage: ToolSpec<ForecastStageArgs> = {
    tool: 'forecast.stage',
    required: ['etapa', 'variedad', 'fecha'],
    validate(args: any) {
        const logs: any = { stage: 'validate.forecast.stage', input: args }
        if (!args?.etapa || typeof args.etapa !== 'string') return fail('SCHEMA_INVALID', 'etapa requerida', logs)
        if (!args?.variedad || typeof args.variedad !== 'string') return fail('SCHEMA_INVALID', 'variedad requerida', logs)
        if (!args?.fecha || typeof args.fecha !== 'string') return fail('SCHEMA_INVALID', 'fecha requerida', logs)
        const out: ForecastStageArgs = { etapa: args.etapa, variedad: args.variedad, fecha: args.fecha }
        return { ok: true, args: out }
    },
}

export const GpsPoints: ToolSpec<GpsPointsArgs> = {
    tool: 'gps.points',
    required: ['fecha'],
    validate(args: any) {
        const logs: any = { stage: 'validate.gps.points', input: args }
        if (!args?.fecha || typeof args.fecha !== 'string') return fail('SCHEMA_INVALID', 'fecha requerida', logs)
        if (args?.horario && !/^\d{2}:\d{2}[–-]\d{2}:\d{2}$/.test(args.horario)) return fail('SCHEMA_INVALID', 'horario mal formado', logs)
        const out: GpsPointsArgs = {
            fecha: args.fecha,
            usuario: args.usuario,
            horario: args.horario,
            precision_m: args.precision_m != null ? Number(args.precision_m) : undefined,
            geo_scope: args.geo_scope,
            geo_id: args.geo_id,
        }
        return { ok: true, args: out }
    },
}

export const Registry = {
    'harvest.aggregate': HarvestAggregate,
    'forecast.stage': ForecastStage,
    'gps.points': GpsPoints,
} as const

export type RegistryType = typeof Registry
