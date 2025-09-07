import { db } from '@/lib/dexie'

export async function initializeDatabase(): Promise<void> {
    try {
        console.log('=== Database Initialization ===')
        console.log('Tables:', db.tables.map(table => table.name))
        console.log('Navigator online:', navigator.onLine)
        const setSyncing = (syncing: boolean, note?: string) => {
            try {
                localStorage.setItem('syncing', syncing ? '1' : '0')
                if (note) localStorage.setItem('sync-note', note); else localStorage.removeItem('sync-note')
                const ev = new CustomEvent('sync:status', { detail: { syncing, note } })
                window.dispatchEvent(ev)
            } catch { }
        }

        const [usuarios, fincas, bloques, camas, variedades] = await Promise.all([
            db.usuario.toArray(),
            db.finca.toArray(),
            db.bloque.toArray(),
            db.cama.toArray(),
            db.variedad.toArray(),
        ])

        console.log('Local data:', {
            usuarios: usuarios.length,
            fincas: fincas.length,
            bloques: bloques.length,
            camas: camas.length,
            variedades: variedades.length,
        })

        if (navigator.onLine) {
            console.log('Syncing data from server...')
            const { syncService } = await import('@/services/sync.service')
            setSyncing(true, 'Sincronizando datos…')
            try {
                await syncService.syncAllData()
            } finally {
                setSyncing(false)
            }

            const [updatedUsuarios, updatedFincas, updatedBloques, updatedCamas, updatedVariedades] = await Promise.all([
                db.usuario.toArray(),
                db.finca.toArray(),
                db.bloque.toArray(),
                db.cama.toArray(),
                db.variedad.toArray(),
            ])

            console.log('Synced data:', {
                usuarios: updatedUsuarios.length,
                fincas: updatedFincas.length,
                bloques: updatedBloques.length,
                camas: updatedCamas.length,
                variedades: updatedVariedades.length,
            })
        } else {
            console.log('Offline mode - using local data only')
        }
    } catch (error) {
        console.error('Error initializing database:', error)
    }
}


