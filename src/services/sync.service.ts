import { supabase } from '@/lib/supabase'
import { db, TABLES } from '@/lib/dexie'

export const syncService = {
    async syncAllData(): Promise<void> {
        try {
            console.log('Starting sync for usuario, finca, bloque, variedad, breeder, grupo_cama, cama, estado_fenologico, medicion_diaria...')

            // Helper to ensure each object has an 'id' field (non-null / non-undefined) before inserting.
            // Tries common alternative key names used previously or in potential backend schemas.
            const ensureIds = (label: string, rows: any[] | null | undefined, altKeys: string[] = []): any[] => {
                if (!rows) return []
                let fixed = 0
                let skipped = 0
                const result = rows.map((r, idx) => {
                    if (r && (r.id === undefined || r.id === null)) {
                        const candidateKey = [
                            ...altKeys,
                            // generic fallbacks
                            `${label}_id`,
                            `${label}Id`,
                            `${label}ID`,
                            'uuid',
                            'UID'
                        ].find(k => k in r && r[k] !== undefined && r[k] !== null)
                        if (candidateKey) {
                            r.id = r[candidateKey]
                            fixed++
                        }
                    }
                    if (r && (r.id === undefined || r.id === null)) {
                        skipped++
                        console.warn(`[sync] ${label} row at index ${idx} missing id even after fallback keys. Keys:`, Object.keys(r))
                        return null // mark for filtering
                    }
                    return r
                }).filter(Boolean)
                if (fixed || skipped) {
                    console.info(`[sync] ${label}: ${fixed} rows fixed missing id; ${skipped} rows skipped.`)
                }
                return result as any[]
            }

            // Sync usuarios
            const { data: usuariosRaw, error: usuariosError } = await supabase.from(TABLES.usuario).select('*')
            if (usuariosError) throw usuariosError
            const usuariosData = ensureIds('usuario', usuariosRaw, ['id_usuario']).map(u => {
                if ((u.id == null) && u.id_usuario != null) u.id = u.id_usuario
                if (!u.pin && u.clave_pin) u.pin = u.clave_pin
                if (!u.created_at && u.creado_en) u.created_at = u.creado_en
                if (u.eliminado_en && !u.deleted_at) u.deleted_at = u.eliminado_en
                return u
            })
            if (usuariosData && Array.isArray(usuariosData)) {
                if (db.tables.some(table => table.name === 'usuario')) {
                    await db.usuario.clear()
                    await db.usuario.bulkPut(usuariosData)
                    console.log(`Replaced with ${usuariosData.length} usuario records`)
                } else {
                    console.warn('usuario table not defined in Dexie schema, skipping sync')
                }
            }

            // Sync fincas
            const { data: fincasRaw, error: fincasError } = await supabase.from(TABLES.finca).select('*')
            if (fincasError) throw fincasError
            const fincasData = ensureIds('finca', fincasRaw, ['finca_id', 'id_finca']).map(f => {
                if ((f.id == null) && f.id_finca != null) f.id = f.id_finca
                if ((f.id == null) && f.finca_id != null) f.id = f.finca_id
                if (!f.created_at && f.creado_en) f.created_at = f.creado_en
                if (f.eliminado_en && !f.deleted_at) f.deleted_at = f.eliminado_en
                if (f.deleted_at) return null
                return f
            }).filter(Boolean)
            if (fincasData && Array.isArray(fincasData)) {
                if (db.tables.some(table => table.name === 'finca')) {
                    await db.finca.clear()
                    await db.finca.bulkPut(fincasData)
                    console.log(`Replaced with ${fincasData.length} finca records`)
                } else {
                    console.warn('finca table not defined in Dexie schema, skipping sync')
                }
            }

            // Sync bloques (normalize bloque_id -> id, set codigo fallback, coerce numeric fields)
            const { data: bloquesRaw, error: bloquesError } = await supabase.from(TABLES.bloque).select('*')
            if (bloquesError) throw bloquesError
            let bloquesData = ensureIds('bloque', bloquesRaw, ['bloque_id', 'id_bloque'])
            bloquesData = bloquesData.map(b => {
                if ((b.id == null) && b.id_bloque != null) b.id = b.id_bloque
                if ((b.id == null) && b.bloque_id != null) b.id = b.bloque_id
                // Coerce id & finca_id numeric if they are strings
                if ((b.finca_id == null) && b.id_finca != null) b.finca_id = b.id_finca
                if (typeof b.id === 'string' && /^\d+$/.test(b.id)) b.id = Number(b.id)
                if (typeof b.finca_id === 'string' && /^\d+$/.test(b.finca_id)) b.finca_id = Number(b.finca_id)
                // Some backends send numeric 'nombre' while legacy UI expects 'codigo'
                if (!b.codigo && b.nombre != null) {
                    b.codigo = String(b.nombre)
                }
                if (!b.created_at && b.creado_en) b.created_at = b.creado_en
                if (b.eliminado_en && !b.deleted_at) b.deleted_at = b.eliminado_en
                if (b.deleted_at) return null
                return b
            }).filter(Boolean)
            if (bloquesData && Array.isArray(bloquesData)) {
                if (db.tables.some(table => table.name === 'bloque')) {
                    await db.bloque.clear()
                    await db.bloque.bulkPut(bloquesData)
                    console.log(`[sync] Replaced with ${bloquesData.length} bloque records (normalized)`)
                } else {
                    console.warn('bloque table not defined in Dexie schema, skipping sync')
                }
            }

            // Sync variedades
            const { data: variedadesRaw, error: variedadesError } = await supabase.from(TABLES.variedad).select('*')
            if (variedadesError) throw variedadesError
            const variedadesData = ensureIds('variedad', variedadesRaw, ['variedad_id', 'id_variedad']).map(v => {
                if ((v.id == null) && v.id_variedad != null) v.id = v.id_variedad
                if ((v.id == null) && v.variedad_id != null) v.id = v.variedad_id
                if (v.id_obtentor != null && v.breeder_id == null) v.breeder_id = v.id_obtentor
                if (!v.created_at && v.creado_en) v.created_at = v.creado_en
                if (v.eliminado_en && !v.deleted_at) v.deleted_at = v.eliminado_en
                if (v.deleted_at) return null
                return v
            }).filter(Boolean)
            if (variedadesData && Array.isArray(variedadesData)) {
                if (db.tables.some(table => table.name === 'variedad')) {
                    await db.variedad.clear()
                    await db.variedad.bulkPut(variedadesData)
                    console.log(`Replaced with ${variedadesData.length} variedad records`)
                } else {
                    console.warn('variedad table not defined in Dexie schema, skipping sync')
                }
            }

            // Sync breeder
            try {
                const { data: breederRaw, error: breederError } = await supabase.from(TABLES.breeder).select('*')
                if (breederError) throw breederError
                const breederData = ensureIds('breeder', breederRaw, ['breeder_id', 'id_obtentor']).map(b => {
                    if ((b.id == null) && b.id_obtentor != null) b.id = b.id_obtentor
                    if ((b.id == null) && b.breeder_id != null) b.id = b.breeder_id
                    if (!b.created_at && b.creado_en) b.created_at = b.creado_en
                    if (b.eliminado_en && !b.deleted_at) b.deleted_at = b.eliminado_en
                    if (b.deleted_at) return null
                    return b
                }).filter(Boolean)
                if (db.tables.some(t => t.name === TABLES.breeder)) {
                    await db.breeder.clear();
                    await db.breeder.bulkPut(breederData)
                    console.log(`[sync] Replaced with ${breederData.length} breeder records`)
                }
            } catch (be) {
                console.error('breeder sync error:', be)
            }

            // Sync grupo_cama
            try {
                const { data: gruposRaw, error: gruposError } = await supabase.from(TABLES.grupoCama).select('*')
                if (gruposError) throw gruposError
                const gruposData = ensureIds('grupo_cama', gruposRaw, ['grupo_id', 'id_grupo']).map(g => {
                    if ((g.grupo_id == null) && g.id_grupo != null) g.grupo_id = g.id_grupo
                    if (g.id_variedad != null && g.variedad_id == null) g.variedad_id = g.id_variedad
                    if (g.id_bloque != null && g.bloque_id == null) g.bloque_id = g.id_bloque
                    if (!g.created_at && g.creado_en) g.created_at = g.creado_en
                    if (g.eliminado_en && !g.deleted_at) g.deleted_at = g.eliminado_en
                    if (g.deleted_at) return null
                    return g
                }).filter(Boolean)
                if (db.tables.some(t => t.name === TABLES.grupoCama)) {
                    await db.grupoCama.clear()
                    await db.grupoCama.bulkPut(gruposData)
                    console.log(`[sync] Replaced with ${gruposData.length} grupo_cama records`)
                }
            } catch (ge) {
                console.error('grupo_cama sync error:', ge)
            }

            // Sync camas (normalize cama_id -> id, coerce bloque_id, filter deleted, preserve metrics)
            const { data: camasRaw, error: camasError } = await supabase.from(TABLES.cama).select('*')
            if (camasError) throw camasError
            let camasData = ensureIds('cama', camasRaw, ['cama_id', 'id_cama'])
            camasData = camasData.map(c => {
                if ((c.id == null) && c.id_cama != null) c.id = c.id_cama
                if ((c.id == null) && c.cama_id != null) c.id = c.cama_id
                if ((c.bloque_id == null) && c.id_bloque != null) c.bloque_id = c.id_bloque
                if (typeof c.id === 'string' && /^\d+$/.test(c.id)) c.id = Number(c.id)
                if (typeof c.bloque_id === 'string' && /^\d+$/.test(c.bloque_id)) c.bloque_id = Number(c.bloque_id)
                if (c.area == null && c.area_m2 != null) c.area = c.area_m2
                if (!c.created_at && c.creado_en) c.created_at = c.creado_en
                if (c.eliminado_en && !c.deleted_at) c.deleted_at = c.eliminado_en
                if (c.deleted_at) return null
                return c
            }).filter(Boolean)
            if (camasData && Array.isArray(camasData)) {
                if (db.tables.some(table => table.name === 'cama')) {
                    await db.cama.clear()
                    await db.cama.bulkPut(camasData)
                    console.log(`[sync] Replaced with ${camasData.length} cama records (normalized, filtered deleted)`)
                } else {
                    console.warn('cama table not defined in Dexie schema, skipping sync')
                }
            }

            // Sync estado_fenologico
            try {
                if (db.tables.some(t => t.name === TABLES.estadoFenologico)) {
                    let { data: estadosRaw, error: estadosError } = await supabase.from(TABLES.estadoFenologico).select('*')
                    if (estadosError && (estadosError as any).code === 'PGRST205') {
                        console.warn('estado_fenologico table missing; trying plural estados_fenologicos')
                        const pluralName = 'estados_fenologicos'
                        const { data: pluralData, error: pluralErr } = await supabase.from(pluralName).select('*')
                        if (!pluralErr) {
                            estadosRaw = pluralData as any
                            estadosError = undefined as any
                        } else {
                            throw estadosError
                        }
                    }
                    if (estadosError) throw estadosError
                    const estadosData = ensureIds('estado_fenologico', estadosRaw, ['id_estado_fenologico']).map(e => {
                        if ((e.id == null) && e.id_estado_fenologico != null) e.id = e.id_estado_fenologico
                        if (!e.created_at && e.creado_en) e.created_at = e.creado_en
                        if (e.eliminado_en && !e.deleted_at) e.deleted_at = e.eliminado_en
                        if (e.deleted_at) return null
                        return e
                    }).filter(Boolean)
                    await db.estadoFenologico.clear()
                    await db.estadoFenologico.bulkPut(estadosData)
                    console.log(`[sync] Replaced with ${estadosData.length} estado_fenologico records`)
                }
            } catch (efe) {
                console.warn('estado_fenologico sync error', efe)
            }

            // Sync medicion_diaria
            try {
                if (db.tables.some(t => t.name === TABLES.medicionDiaria)) {
                    let { data: medRaw, error: medErr } = await supabase.from(TABLES.medicionDiaria).select('*')
                    if (medErr && (medErr as any).code === 'PGRST205') {
                        console.warn('medicion_diaria table missing; trying plural mediciones_diarias')
                        const pluralName = 'mediciones_diarias'
                        const { data: pluralData, error: pluralErr } = await supabase.from(pluralName).select('*')
                        if (!pluralErr) {
                            medRaw = pluralData as any
                            medErr = undefined as any
                        } else {
                            throw medErr
                        }
                    }
                    if (medErr) throw medErr
                    const medData = ensureIds('medicion_diaria', medRaw, ['id_medicion']).map(m => {
                        if ((m.id == null) && m.id_medicion != null) m.id = m.id_medicion
                        if ((m.cama_id == null) && m.id_cama != null) m.cama_id = m.id_cama
                        if ((m.usuario_id == null) && m.id_usuario != null) m.usuario_id = m.id_usuario
                        if (!m.created_at && m.creado_en) m.created_at = m.creado_en
                        if (m.eliminado_en && !m.deleted_at) m.deleted_at = m.eliminado_en
                        if (m.deleted_at) return null
                        return m
                    }).filter(Boolean)
                    await db.medicionDiaria.clear()
                    await db.medicionDiaria.bulkPut(medData)
                    console.log(`[sync] Replaced with ${medData.length} medicion_diaria records`)
                }
            } catch (md) {
                console.warn('medicion_diaria sync error', md)
            }

            console.log('All data sync completed')
        } catch (error) {
            console.error('Error during data sync:', error)
        }
    }
}