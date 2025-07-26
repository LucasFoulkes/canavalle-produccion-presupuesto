import { supabase } from '@/lib/supabase'
import { db } from '@/lib/dexie'

export const syncService = {
    async syncAllData(): Promise<void> {
        try {
            console.log('Starting sync for usuarios, fincas, bloques, camas, and variedades...')

            // Sync usuarios
            const { data: usuariosData, error: usuariosError } = await supabase.from('usuarios').select('*')
            if (usuariosError) throw usuariosError
            if (usuariosData && Array.isArray(usuariosData)) {
                if (db.tables.some(table => table.name === 'usuarios')) {
                    await db.usuarios.bulkPut(usuariosData)
                    console.log(`Updated ${usuariosData.length} usuarios records`)
                } else {
                    console.warn('usuarios table not defined in Dexie schema, skipping sync')
                }
            }

            // Sync fincas
            const { data: fincasData, error: fincasError } = await supabase.from('fincas').select('*')
            if (fincasError) throw fincasError
            if (fincasData && Array.isArray(fincasData)) {
                if (db.tables.some(table => table.name === 'fincas')) {
                    await db.fincas.bulkPut(fincasData)
                    console.log(`Updated ${fincasData.length} fincas records`)
                } else {
                    console.warn('fincas table not defined in Dexie schema, skipping sync')
                }
            }

            // Sync bloques
            const { data: bloquesData, error: bloquesError } = await supabase.from('bloques').select('*')
            if (bloquesError) throw bloquesError
            if (bloquesData && Array.isArray(bloquesData)) {
                if (db.tables.some(table => table.name === 'bloques')) {
                    await db.bloques.bulkPut(bloquesData)
                    console.log(`Updated ${bloquesData.length} bloques records`)
                } else {
                    console.warn('bloques table not defined in Dexie schema, skipping sync')
                }
            }

            // Sync variedades
            const { data: variedadesData, error: variedadesError } = await supabase.from('variedades').select('*')
            if (variedadesError) throw variedadesError
            if (variedadesData && Array.isArray(variedadesData)) {
                if (db.tables.some(table => table.name === 'variedades')) {
                    await db.variedades.bulkPut(variedadesData)
                    console.log(`Updated ${variedadesData.length} variedades records`)
                } else {
                    console.warn('variedades table not defined in Dexie schema, skipping sync')
                }
            }

            // Sync camas
            const { data: camasData, error: camasError } = await supabase.from('camas').select('*')
            if (camasError) throw camasError
            if (camasData && Array.isArray(camasData)) {
                if (db.tables.some(table => table.name === 'camas')) {
                    await db.camas.bulkPut(camasData)
                    console.log(`Updated ${camasData.length} camas records`)
                } else {
                    console.warn('camas table not defined in Dexie schema, skipping sync')
                }
            }

            console.log('All data sync completed')
        } catch (error) {
            console.error('Error during data sync:', error)
        }
    }
}