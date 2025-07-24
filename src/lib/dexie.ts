import Dexie, { Table } from 'dexie';
import { Usuario, Finca, Bloque } from '@/types/database';

export class AppDatabase extends Dexie {
    usuarios!: Table<Usuario>;
    fincas!: Table<Finca>;
    bloques!: Table<Bloque>;

    constructor() {
        super('AppDatabase');
        this.version(1).stores({
            usuarios: '++id, nombres, apellidos, rol, pin',
            fincas: '++id, nombre',
            bloques: '++id, finca_id, nombre'
        });
    }
}

export const db = new AppDatabase();
