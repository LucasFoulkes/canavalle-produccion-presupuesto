import { db, OutboxItem } from './dexie';
import { v4 as uuidv4 } from 'uuid';
import { supabase } from './supabase';

/**
 * Service for handling offline data synchronization using the outbox pattern
 */
export const outboxService = {
    /**
     * Add an item to the outbox for later synchronization
     */
    async addToOutbox(
        table: string,
        operation: 'create' | 'update' | 'delete',
        data: any
    ): Promise<string> {
        const id = uuidv4();
        const item: OutboxItem = {
            id,
            table,
            operation,
            data,
            timestamp: Date.now(),
            retryCount: 0,
            status: 'pending'
        };

        await db.outbox.add(item);
        console.log(`Added ${operation} operation on ${table} to outbox`);

        // Try to process immediately if online
        if (navigator.onLine) {
            processOutbox().catch(console.error);
        }

        return id;
    },

    /**
     * Get all pending outbox items
     */
    async getPendingItems(): Promise<OutboxItem[]> {
        return db.outbox
            .where('status')
            .equals('pending')
            .sortBy('timestamp');
    },

    /**
     * Get the count of pending outbox items
     */
    async getPendingCount(): Promise<number> {
        return db.outbox
            .where('status')
            .equals('pending')
            .count();
    }
};

/**
 * Process all pending items in the outbox
 */
export async function processOutbox(): Promise<void> {
    if (!navigator.onLine) {
        console.log('Offline, skipping outbox processing');
        return;
    }

    console.log('Processing outbox...');
    const items = await outboxService.getPendingItems();

    if (items.length === 0) {
        console.log('No pending items in outbox');
        return;
    }

    console.log(`Found ${items.length} items to process`);

    for (const item of items) {
        try {
            // Mark as processing
            await db.outbox.update(item.id, { status: 'processing' });

            // Process based on operation type and table
            let result;

            // Special handling for acciones table
            if (item.table === 'acciones') {
                // For acciones, we need to find the server cama_id based on the local cama_id
                const localCamaId = item.data.local_cama_id || item.data.cama_id;

                // Get the local cama details
                const localCama = await db.camas.get(localCamaId);
                if (!localCama) {
                    throw new Error('Local cama not found');
                }

                // Find the corresponding cama on the server by bloque_id and nombre
                const { data: serverCama, error: findError } = await supabase
                    .from('camas')
                    .select('id')
                    .eq('bloque_id', localCama.bloque_id)
                    .eq('nombre', localCama.nombre)
                    .single();

                let serverCamaId: number;

                if (findError || !serverCama) {
                    // Cama doesn't exist on server, create it
                    console.log('Cama not found on server, creating it...');

                    const { data: newCama, error: createError } = await supabase
                        .from('camas')
                        .insert({
                            bloque_id: localCama.bloque_id,
                            variedad_id: localCama.variedad_id,
                            nombre: localCama.nombre
                        })
                        .select('id')
                        .single();

                    if (createError) throw createError;
                    serverCamaId = newCama.id;
                } else {
                    serverCamaId = serverCama.id;
                }

                // Prepare the data for server by replacing local cama_id with server cama_id
                const serverData = { ...item.data };
                delete serverData.local_cama_id; // Remove the local reference
                serverData.cama_id = serverCamaId; // Set the server cama_id

                // Check if there's already an entry for the same day for this cama
                const createdDate = new Date(serverData.created_at);
                const dateString = createdDate.toISOString().split('T')[0];

                const { data: existingAccion, error: findAccionError } = await supabase
                    .from('acciones')
                    .select('*')
                    .eq('cama_id', serverCamaId)
                    .gte('created_at', dateString)
                    .lt('created_at', dateString + 'T23:59:59.999Z')
                    .maybeSingle();

                if (findAccionError && findAccionError.code !== 'PGRST116') {
                    // PGRST116 is "not found" which is expected, other errors are real problems
                    throw findAccionError;
                }

                if (existingAccion) {
                    // Update existing entry for the same day
                    console.log(`Updating existing accion for cama ${serverCamaId}`);

                    // Extract only the action fields that have values
                    const updateData: Record<string, any> = {};
                    const actionFields = [
                        'produccion_real', 'pinche_apertura', 'pinche_sanitario', 'pinche_tierno',
                        'temperatura', 'humedad', 'arveja', 'garbanzo', 'uva', 'arroz',
                        'rayando_color', 'sepalos_abiertos', 'cosecha'
                    ];

                    actionFields.forEach(field => {
                        if (serverData[field] !== undefined && serverData[field] !== null) {
                            updateData[field] = serverData[field];
                        }
                    });

                    result = await supabase
                        .from('acciones')
                        .update(updateData)
                        .eq('id', existingAccion.id);
                } else {
                    // Create new entry
                    console.log(`Creating new accion for cama ${serverCamaId}`);
                    result = await supabase.from('acciones').insert(serverData);
                }
            } else {
                // Standard processing for other tables
                switch (item.operation) {
                    case 'create':
                        result = await supabase.from(item.table).insert(item.data);
                        break;
                    case 'update':
                        result = await supabase.from(item.table).update(item.data).eq('id', item.data.id);
                        break;
                    case 'delete':
                        result = await supabase.from(item.table).delete().eq('id', item.data.id);
                        break;
                }
            }

            if (result?.error) {
                throw result.error;
            }

            // Success - remove from outbox
            await db.outbox.delete(item.id);
            console.log(`Successfully processed ${item.operation} on ${item.table}`);

        } catch (error) {
            console.error(`Failed to process outbox item ${item.id}:`, error);

            // Update retry count and status
            const retryCount = item.retryCount + 1;
            const status = retryCount >= 5 ? 'failed' : 'pending';

            await db.outbox.update(item.id, {
                retryCount,
                status,
                timestamp: Date.now() // Push it back in the queue
            });
        }
    }

    console.log('Outbox processing complete');
}

/**
 * Initialize the outbox synchronization
 */
export function initOutboxSync(): void {
    // Process outbox when coming online
    window.addEventListener('online', () => {
        console.log('Online - processing outbox');
        processOutbox().catch(console.error);
    });

    // Set up periodic processing (every 5 minutes)
    setInterval(() => {
        if (navigator.onLine) {
            processOutbox().catch(console.error);
        }
    }, 5 * 60 * 1000);
}