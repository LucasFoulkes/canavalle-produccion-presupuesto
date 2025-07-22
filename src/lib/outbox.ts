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

            // Process based on operation type
            let result;

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