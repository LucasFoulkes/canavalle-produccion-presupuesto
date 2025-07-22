import Dexie from 'dexie'
import { Usuario } from '@/services/auth.service'
import { Finca, Bloque, Variedad, Accion, Cama, BloqueVariedad, EstadoFenologico } from '@/types/database'

// Define the outbox item interface
export interface OutboxItem {
    id: string;
    table: string;
    operation: 'create' | 'update' | 'delete';
    data: any;
    timestamp: number;
    retryCount: number;
    status: 'pending' | 'processing' | 'failed';
}

class AppDB extends Dexie {
    usuarios: Dexie.Table<Usuario, number>
    fincas: Dexie.Table<Finca, number>
    bloques: Dexie.Table<Bloque, number>
    variedades: Dexie.Table<Variedad, number>
    bloqueVariedades: Dexie.Table<BloqueVariedad, number>
    acciones: Dexie.Table<Accion, number>
    camas: Dexie.Table<Cama, number>
    estadosFenologicos: Dexie.Table<EstadoFenologico, number>
    outbox: Dexie.Table<OutboxItem, string>

    constructor() {
        super('AppDB')
        this.version(3).stores({
            usuarios: 'id,pin,nombres,apellidos,rol',
            fincas: 'id,nombre',
            bloques: 'id,finca_id,nombre',
            variedades: 'id,nombre',
            bloqueVariedades: 'id,bloque_id,variedad_id',
            acciones: 'id,cama_id,created_at',
            camas: 'id,bloque_id,variedad_id,nombre',
            estadosFenologicos: 'id,bloque_variedad_id',
            outbox: 'id,table,operation,timestamp,status,retryCount'
        })

        this.usuarios = this.table('usuarios')
        this.fincas = this.table('fincas')
        this.bloques = this.table('bloques')
        this.variedades = this.table('variedades')
        this.bloqueVariedades = this.table('bloqueVariedades')
        this.acciones = this.table('acciones')
        this.camas = this.table('camas')
        this.estadosFenologicos = this.table('estadosFenologicos')
        this.outbox = this.table('outbox')
    }
}

export const db = new AppDB()
