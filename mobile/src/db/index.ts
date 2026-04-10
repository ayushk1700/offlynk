import { Database } from '@nozbe/watermelondb';
import SQLiteAdapter from '@nozbe/watermelondb/adapters/sqlite';

import schema from './schema';
import Message from '../models/Message';
import Chat from '../models/Chat';
import User from '../models/User';
import Outbox from '../models/Outbox'; // FIX: was missing

const adapter = new SQLiteAdapter({
  schema,
  dbName: 'offlynkDB',
  jsi: true,
  onSetUpError: (error) => {
    console.error('[DB] Setup error:', error);
  },
});

export const database = new Database({
  adapter,
  modelClasses: [
    Message,
    Chat,
    User,
    Outbox, // FIX: was missing — caused all outbox writes to fail silently
  ],
});
