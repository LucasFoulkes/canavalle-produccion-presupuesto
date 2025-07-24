import Dexie, { Table } from 'dexie';
import { Usuario } from '@/types/database';

export class AppDatabase extends Dexie {
    usuarios!: Table<Usuario>;

    constructor() {
        super('AppDatabase');
        this.version(1).stores({
            usuarios: '++id, nombres, apellidos, rol, pin'
        });
    }
}

export const db = new AppDatabase();
