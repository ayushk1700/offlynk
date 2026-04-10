import { Q } from '@nozbe/watermelondb';
import { database } from '../../db';
import Outbox from '../../models/Outbox';
import { transportManager } from './transportManager';

const MAX_ATTEMPTS = 10; // Hardening: prevent infinite retry loops

export const startSyncWorker = () => {
  setInterval(async () => {
    const pending = await database.get<Outbox>('outbox').query().fetch();
    if (pending.length === 0) return;

    console.log(`[Sync] Flushing ${pending.length} queued packets...`);

    for (const record of pending) {
      // Hardening: drop packets that have exceeded max retry cap
      if (record.attempts >= MAX_ATTEMPTS) {
        console.warn(`[Sync] Dropping packet ${record.packetId} — exceeded ${MAX_ATTEMPTS} attempts`);
        await database.write(async () => record.destroyPermanently());
        continue;
      }

      const packet = JSON.parse(record.blob);
      const success = await transportManager.send(packet);

      await database.write(async () => {
        if (success) {
          await record.destroyPermanently();
        } else {
          await record.update((r) => {
            r.attempts += 1;
            r.lastAttemptAt = Date.now();
          });
        }
      });
    }
  }, 30_000);
};
