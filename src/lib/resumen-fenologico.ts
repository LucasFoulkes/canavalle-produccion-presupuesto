import { getStore } from '@/lib/dexie'
import { formatDate, formatInt, formatPct3 } from '@/lib/utils'

export type ResumenFenologicoRow = {
  finca: string
  bloque: string
  variedad: string
  fecha?: string | null
  fincaId: string
  bloqueId: string
  variedadId: string
  rowKey: string
  dias_brotacion: number; dias_brotacion_pct: number
  dias_cincuenta_mm: number; dias_cincuenta_mm_pct: number
  dias_quince_cm: number; dias_quince_cm_pct: number
  dias_veinte_cm: number; dias_veinte_cm_pct: number
  dias_primera_hoja: number; dias_primera_hoja_pct: number
  dias_espiga: number; dias_espiga_pct: number
  dias_arroz: number; dias_arroz_pct: number
  dias_arveja: number; dias_arveja_pct: number
  dias_garbanzo: number; dias_garbanzo_pct: number
  dias_uva: number; dias_uva_pct: number
  dias_rayando_color: number; dias_rayando_color_pct: number
  dias_sepalos_abiertos: number; dias_sepalos_abiertos_pct: number
  dias_cosecha: number; dias_cosecha_pct: number
}

export const STAGE_KEYS = [
  'dias_brotacion',
  'dias_cincuenta_mm',
  'dias_quince_cm',
  'dias_veinte_cm',
  'dias_primera_hoja',
  'dias_espiga',
  'dias_arroz',
  'dias_arveja',
  'dias_garbanzo',
  'dias_uva',
  'dias_rayando_color',
  'dias_sepalos_abiertos',
  'dias_cosecha',
] as const

export const STAGE_LABELS: Record<typeof STAGE_KEYS[number], string> = {
  dias_brotacion: 'Brotacion',
  dias_cincuenta_mm: '50 mm',
  dias_quince_cm: '15 cm',
  dias_veinte_cm: '20 cm',
  dias_primera_hoja: 'Primera hoja',
  dias_espiga: 'Espiga',
  dias_arroz: 'Arroz',
  dias_arveja: 'Arveja',
  dias_garbanzo: 'Garbanzo',
  dias_uva: 'Uva',
  dias_rayando_color: 'Rayando color',
  dias_sepalos_abiertos: 'Sepalos abiertos',
  dias_cosecha: 'Cosecha',
}

export type ResumenFenologicoResult = {
  rows: ResumenFenologicoRow[]
  estados: Map<string, any[]>
}

const normalize = (s: any) =>
  String(s ?? '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, '_')
    .replace(/[^a-z0-9_]/g, '')

const parseNumber = (val: any): number => {
  if (typeof val === 'number') return Number.isFinite(val) ? val : 0
  if (typeof val === 'string') {
    const s = val.trim()
    if (!s) return 0
    const hasComma = s.includes(',')
    const hasDot = s.includes('.')
    let normalized = s
    if (hasComma && (!hasDot || (hasDot && hasComma))) {
      normalized = s.replace(/\./g, '').replace(/,/g, '.')
    }
    const n = Number(normalized)
    return Number.isNaN(n) ? 0 : n
  }
  return 0
}

const mapTipoToStageKey = (tipo: any): typeof STAGE_KEYS[number] | null => {
  const t = normalize(tipo)
  const direct = t.startsWith('dias_') ? t : `dias_${t}`
  if ((STAGE_KEYS as readonly string[]).includes(direct)) return direct as any
  const syn: Record<string, typeof STAGE_KEYS[number]> = {
    brotacion: 'dias_brotacion',
    '50mm': 'dias_cincuenta_mm',
    '50_mm': 'dias_cincuenta_mm',
    cincuentamm: 'dias_cincuenta_mm',
    cincuenta_mm: 'dias_cincuenta_mm',
    quincecm: 'dias_quince_cm',
    '15cm': 'dias_quince_cm',
    '15_cm': 'dias_quince_cm',
    quince_cm: 'dias_quince_cm',
    veintecm: 'dias_veinte_cm',
    '20cm': 'dias_veinte_cm',
    '20_cm': 'dias_veinte_cm',
    veinte_cm: 'dias_veinte_cm',
    primerahoja: 'dias_primera_hoja',
    primera_hoja: 'dias_primera_hoja',
    espiga: 'dias_espiga',
    arroz: 'dias_arroz',
    arveja: 'dias_arveja',
    garbanzo: 'dias_garbanzo',
    uva: 'dias_uva',
    rayandocolor: 'dias_rayando_color',
    rayando_color: 'dias_rayando_color',
    sepalosabiertos: 'dias_sepalos_abiertos',
    sepalos_abiertos: 'dias_sepalos_abiertos',
    cosecha: 'dias_cosecha',
  }
  return syn[t] ?? null
}

const mapBy = <T extends Record<string, any>>(arr: T[], key: string) => {
  const m = new Map<string, T>()
  for (const it of arr) m.set(String(it[key]), it)
  return m
}

export async function fetchResumenFenologico(): Promise<ResumenFenologicoResult> {
  const [observaciones, pinches, camas, grupos, bloques, fincas, variedades, estadosFenologicos] = await Promise.all([
    getStore('observacion').toArray(),
    getStore('pinche').toArray(),
    getStore('cama').toArray(),
    getStore('grupo_cama').toArray(),
    getStore('bloque').toArray(),
    getStore('finca').toArray(),
    getStore('variedad').toArray(),
    getStore('estados_fenologicos').toArray(),
  ])

  let seccionLargoM = 0
  try {
    const secciones = await getStore('seccion').toArray()
    if (secciones && secciones.length > 0) {
      const s0: any = secciones[0]
      seccionLargoM = Number(s0?.largo_m) || 0
    }
  } catch {
    // ignore local errors; if not present, the value stays 0
  }

  const camasById = mapBy(camas as any[], 'id_cama')
  const gruposById = mapBy(grupos as any[], 'id_grupo')
  const bloquesById = mapBy(bloques as any[], 'id_bloque')
  const fincasById = mapBy(fincas as any[], 'id_finca')
  const variedadesById = mapBy(variedades as any[], 'id_variedad')

  const estadosByKey = new Map<string, any[]>()
  for (const estado of (estadosFenologicos as any[])) {
    if (!estado) continue
    const bloqueId = String((estado as any)?.id_bloque ?? '')
    const variedadId = String((estado as any)?.id_variedad ?? '')
    let fincaId = String((estado as any)?.id_finca ?? '')
    if (!fincaId && bloqueId) {
      const bloque = bloquesById.get(bloqueId)
      if (bloque) fincaId = String((bloque as any)?.id_finca ?? '')
    }
    if (!bloqueId || !variedadId || !fincaId) continue
    const key = `${bloqueId}|${variedadId}|${fincaId}`
    if (!estadosByKey.has(key)) estadosByKey.set(key, [])
    estadosByKey.get(key)!.push(estado)
  }

  const ESTADO_PRODUCTIVO = 'productivo'
  const areaByBloqueVar = new Map<string, number>()
  for (const c of camas as any[]) {
    const g = gruposById.get(String((c as any).id_grupo))
    if (!g) continue
    const estado = String((g as any).estado ?? '').toLowerCase()
    if (estado !== ESTADO_PRODUCTIVO) continue
    const key = `${String((g as any).id_bloque)}|${String((g as any).id_variedad)}`
    const largo = Number((c as any).largo_metros) || 0
    const ancho = Number((c as any).ancho_metros) || 0
    const area = largo * ancho
    areaByBloqueVar.set(key, (areaByBloqueVar.get(key) || 0) + area)
  }

  type Leaf = {
    count: number
    areaSampled: number
    bloqueId: string
    variedadId: string
    fincaId: string
    dateKey: string
    stageKey: typeof STAGE_KEYS[number]
    isPinche?: boolean
  }
  const leafAcc = new Map<string, Leaf>()
  const dateTouched = new Map<string, Set<string>>()

  for (const o of (observaciones as any[])) {
    const idCama = String(o?.id_cama ?? '')
    if (!idCama) continue
    const cama = camasById.get(idCama)
    if (!cama) continue
    const g = gruposById.get(String((cama as any)?.id_grupo))
    if (!g) continue
    const bloqueId = String((g as any).id_bloque)
    const variedadId = String((g as any).id_variedad)
    const b = bloquesById.get(bloqueId)
    const f = b ? fincasById.get(String((b as any).id_finca)) : undefined
    const fincaId = f ? String((f as any).id_finca) : ''

    const rawDate: any = (o as any)?.creado_en ?? (o as any)?.fecha ?? null
    let dateKey = ''
    if (rawDate) {
      const d = new Date(rawDate)
      if (!Number.isNaN(d.getTime())) dateKey = d.toISOString().slice(0, 10)
    }
    if (!dateKey) continue

    const dvKey = `${bloqueId}|${variedadId}`
    if (!dateTouched.has(dvKey)) dateTouched.set(dvKey, new Set())
    dateTouched.get(dvKey)!.add(dateKey)

    const stageKey = mapTipoToStageKey(o?.tipo_observacion)
    if (!stageKey) continue

    const largo = Number((cama as any)?.largo_metros) || 0
    const ancho = Number((cama as any)?.ancho_metros) || 0
    const areaCama = largo * ancho
    if (areaCama <= 0 || ancho <= 0) continue

    const effectiveLength = seccionLargoM > 0 ? Math.min(seccionLargoM, largo) : largo
    const areaSampled = effectiveLength * ancho
    if (areaSampled <= 0) continue

    const cant = parseNumber((o as any)?.cantidad)
    if (cant <= 0) continue

    const leafKey = `${bloqueId}|${variedadId}|${dateKey}|${stageKey}|${idCama}`
    const existing = leafAcc.get(leafKey)
    if (existing) {
      existing.count += cant
    } else {
      leafAcc.set(leafKey, { count: cant, areaSampled, bloqueId, variedadId, fincaId, dateKey, stageKey })
    }
  }

  // Integrate pinches as 'brotacion' entries affecting predictions directly.
  // Pinches are "always for 100 of the seccion" -> treat as 100% coverage for that (bloque,variedad) on that date.
  for (const p of (pinches as any[])) {
    const bloqueId = String(p?.bloque ?? '')
    const variedadId = String(p?.variedad ?? '')
    let camaId: string | null = p?.cama ? String(p.cama) : null
    // If bloque/variedad missing, try derive from cama
    let bId = bloqueId
    let vId = variedadId
    if ((!bId || !vId) && camaId) {
      const cama = camasById.get(camaId)
      if (cama) {
        const g = gruposById.get(String((cama as any)?.id_grupo))
        if (g) {
          bId = String((g as any).id_bloque)
          vId = String((g as any).id_variedad)
        }
      }
    }
    if (!bId || !vId) continue

    const b = bloquesById.get(bId)
    const f = b ? fincasById.get(String((b as any)?.id_finca)) : undefined
    const fincaId = f ? String((f as any).id_finca) : ''

    const rawDate: any = (p as any)?.created_at
      ?? (p as any)?.creado_en
      ?? (p as any)?.fecha
      ?? (p as any)?.actualizado_en
      ?? null
    let dateKey = ''
    if (rawDate) {
      const d = new Date(rawDate)
      if (!Number.isNaN(d.getTime())) dateKey = d.toISOString().slice(0, 10)
    }
    if (!dateKey) continue

    const dvKey = `${bId}|${vId}`
    if (!dateTouched.has(dvKey)) dateTouched.set(dvKey, new Set())
    dateTouched.get(dvKey)!.add(dateKey)

    const stageKey: typeof STAGE_KEYS[number] = 'dias_brotacion'
    const cant = parseNumber((p as any)?.cantidad)
    if (cant <= 0) continue

    // For pinche, force 100% coverage later by marking isPinche.
    // We can set areaSampled to 0 here; percentage will be overridden.
    const leafKey = `${bId}|${vId}|${dateKey}|${stageKey}|pinche|${String(p?.id ?? Math.random())}`
    const existing = leafAcc.get(leafKey)
    if (existing) {
      existing.count += cant
      existing.isPinche = true
    } else {
      leafAcc.set(leafKey, { count: cant, areaSampled: 0, bloqueId: bId, variedadId: vId, fincaId, dateKey, stageKey, isPinche: true })
    }
  }

  interface StageGroup {
    totalCount: number
    totalAreaSampled: number
    bloqueId: string
    variedadId: string
    fincaId: string
    dateKey: string
    stageKey: typeof STAGE_KEYS[number]
    hasPinche?: boolean
  }
  const stageGroupAcc = new Map<string, StageGroup>()
  for (const leaf of leafAcc.values()) {
    const sgKey = `${leaf.bloqueId}|${leaf.variedadId}|${leaf.dateKey}|${leaf.stageKey}`
    const sg = stageGroupAcc.get(sgKey)
    if (sg) {
      sg.totalCount += leaf.count
      sg.totalAreaSampled += leaf.areaSampled
      if (leaf.isPinche) sg.hasPinche = true
    } else {
      stageGroupAcc.set(sgKey, {
        totalCount: leaf.count,
        totalAreaSampled: leaf.areaSampled,
        bloqueId: leaf.bloqueId,
        variedadId: leaf.variedadId,
        fincaId: leaf.fincaId,
        dateKey: leaf.dateKey,
        stageKey: leaf.stageKey,
        hasPinche: Boolean(leaf.isPinche),
      })
    }
  }

  const rowAcc = new Map<string, ResumenFenologicoRow>()
  const getDisplay = (bloqueId: string, variedadId: string) => {
    const bloque = bloquesById.get(bloqueId)
    const rawFincaId = bloque ? String((bloque as any)?.id_finca ?? '') : ''
    const finca = rawFincaId ? fincasById.get(rawFincaId) : undefined
    const variedad = variedadesById.get(variedadId)
    const fincaId = String((finca as any)?.id_finca ?? rawFincaId ?? '')
    return {
      finca: String((finca as any)?.nombre ?? ''),
      bloque: String((bloque as any)?.nombre ?? ''),
      variedad: String((variedad as any)?.nombre ?? ''),
      fincaId,
      bloqueId,
      variedadId,
    }
  }

  for (const sg of stageGroupAcc.values()) {
    // If the group has pinches, we force 100% coverage even if sampled area is 0,
    // so don't skip those. Otherwise, require sampled area > 0.
    if (sg.totalAreaSampled <= 0 && !sg.hasPinche) continue
    const areaProductiva = areaByBloqueVar.get(`${sg.bloqueId}|${sg.variedadId}`) || 0
    let samplePct = areaProductiva > 0 ? (sg.totalAreaSampled / areaProductiva) * 100 : 0
    if (sg.hasPinche) samplePct = 100
    if (samplePct > 100) samplePct = 100

    const rowKey = `${sg.bloqueId}|${sg.variedadId}|${sg.fincaId}|${sg.dateKey}`
    let row = rowAcc.get(rowKey)
    if (!row) {
      const display = getDisplay(sg.bloqueId, sg.variedadId)
      row = {
        finca: display.finca,
        bloque: display.bloque,
        variedad: display.variedad,
        fecha: sg.dateKey,
        fincaId: display.fincaId,
        bloqueId: display.bloqueId,
        variedadId: display.variedadId,
        rowKey,
        dias_brotacion: 0, dias_brotacion_pct: 0,
        dias_cincuenta_mm: 0, dias_cincuenta_mm_pct: 0,
        dias_quince_cm: 0, dias_quince_cm_pct: 0,
        dias_veinte_cm: 0, dias_veinte_cm_pct: 0,
        dias_primera_hoja: 0, dias_primera_hoja_pct: 0,
        dias_espiga: 0, dias_espiga_pct: 0,
        dias_arroz: 0, dias_arroz_pct: 0,
        dias_arveja: 0, dias_arveja_pct: 0,
        dias_garbanzo: 0, dias_garbanzo_pct: 0,
        dias_uva: 0, dias_uva_pct: 0,
        dias_rayando_color: 0, dias_rayando_color_pct: 0,
        dias_sepalos_abiertos: 0, dias_sepalos_abiertos_pct: 0,
        dias_cosecha: 0, dias_cosecha_pct: 0,
      }
      rowAcc.set(rowKey, row)
    }
    ; (row as any)[sg.stageKey] = sg.totalCount
      ; (row as any)[`${sg.stageKey}_pct`] = samplePct
  }

  for (const [bv, dates] of dateTouched.entries()) {
    const [bloqueId, variedadId] = bv.split('|')
    for (const d of dates) {
      const display = getDisplay(bloqueId, variedadId)
      const rowKey = `${bloqueId}|${variedadId}|${display.fincaId}|${d}`
      if (!rowAcc.has(rowKey)) {
        rowAcc.set(rowKey, {
          finca: display.finca,
          bloque: display.bloque,
          variedad: display.variedad,
          fecha: d,
          fincaId: display.fincaId,
          bloqueId: display.bloqueId,
          variedadId: display.variedadId,
          rowKey,
          dias_brotacion: 0, dias_brotacion_pct: 0,
          dias_cincuenta_mm: 0, dias_cincuenta_mm_pct: 0,
          dias_quince_cm: 0, dias_quince_cm_pct: 0,
          dias_veinte_cm: 0, dias_veinte_cm_pct: 0,
          dias_primera_hoja: 0, dias_primera_hoja_pct: 0,
          dias_espiga: 0, dias_espiga_pct: 0,
          dias_arroz: 0, dias_arroz_pct: 0,
          dias_arveja: 0, dias_arveja_pct: 0,
          dias_garbanzo: 0, dias_garbanzo_pct: 0,
          dias_uva: 0, dias_uva_pct: 0,
          dias_rayando_color: 0, dias_rayando_color_pct: 0,
          dias_sepalos_abiertos: 0, dias_sepalos_abiertos_pct: 0,
          dias_cosecha: 0, dias_cosecha_pct: 0,
        })
      }
    }
  }

  const rows = Array.from(rowAcc.values()).sort((a, b) =>
    a.finca.localeCompare(b.finca, undefined, { sensitivity: 'base' }) ||
    a.bloque.localeCompare(b.bloque, undefined, { sensitivity: 'base' }) ||
    a.variedad.localeCompare(b.variedad, undefined, { sensitivity: 'base' }) ||
    (a.fecha || '').localeCompare(b.fecha || '')
  )

  return { rows, estados: estadosByKey }
}

export const resumenStageHeaders = STAGE_KEYS.map((key) => ({
  key,
  label: STAGE_LABELS[key],
}))

export const formatResumenStage = (value: number, pct: number) => {
  if ((!value || value === 0) && (!pct || pct === 0)) return null
  return `${formatInt(value)} (${formatPct3(pct)}%)`
}

export const formatResumenStageRich = (value: number, pct: number) => {
  if ((!value || value === 0) && (!pct || pct === 0)) return null
  return {
    inline: formatInt(value),
    pct: formatPct3(pct),
  }
}

export const resumenDisplayDate = (value: any) => formatDate(value)
