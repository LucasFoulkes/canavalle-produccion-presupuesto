import Dexie, { Table } from 'dexie';
import { Usuario, Finca, Bloque, Cama } from '@/types/database';

export class AppDatabase extends Dexie {
    usuarios!: Table<Usuario>;
    fincas!: Table<Finca>;
    bloques!: Table<Bloque>;
    camas!: Table<Cama>;

    constructor() {
        super('AppDatabase');
        this.version(1).stores({
            usuarios: '++id, nombres, apellidos, rol, pin',
            fincas: '++id, nombre',
            bloques: '++id, finca_id, nombre',
            camas: '++id, bloque_id, variedad_id, nombre'
        });
    }
}

export const db = new AppDatabase();
