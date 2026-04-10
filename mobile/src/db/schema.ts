import { appSchema, tableSchema } from '@nozbe/watermelondb';

export default appSchema({
  version: 2,
  tables: [
    tableSchema({
      name: 'users',
      columns: [
        { name: 'name', type: 'string' },
        { name: 'phone', type: 'string', isIndexed: true },
        { name: 'public_key', type: 'string' },
        { name: 'identity_key', type: 'string' },
        { name: 'last_seen', type: 'number', isOptional: true },
        { name: 'created_at', type: 'number', isOptional: true },
        { name: 'updated_at', type: 'number', isOptional: true },
      ],
    }),
    tableSchema({
      name: 'chats',
      columns: [
        { name: 'peer_id', type: 'string', isIndexed: true },
        { name: 'is_locked', type: 'boolean' },
        { name: 'disappearing_timer', type: 'number' },
        { name: 'wallpaper', type: 'string', isOptional: true },
        { name: 'theme_color', type: 'string', isOptional: true },
        { name: 'layout_density', type: 'string', isOptional: true },
        { name: 'updated_at', type: 'number' },
        { name: 'created_at', type: 'number', isOptional: true },
      ],
    }),
    tableSchema({
      name: 'messages',
      columns: [
        { name: 'chat_id', type: 'string', isIndexed: true },
        { name: 'sender_id', type: 'string' },
        { name: 'type', type: 'string' },
        { name: 'content', type: 'string' }, // Encrypted blob
        { name: 'timestamp', type: 'number', isIndexed: true },
        { name: 'status', type: 'string' },
        { name: 'is_starred', type: 'boolean' },
        // FIX: added to match Message model @date decorators — missing columns
        // caused WatermelonDB schema validation to throw on startup
        { name: 'created_at', type: 'number', isOptional: true },
        { name: 'updated_at', type: 'number', isOptional: true },
      ],
    }),
    tableSchema({
      name: 'outbox',
      columns: [
        { name: 'packet_id', type: 'string', isIndexed: true },
        { name: 'recipient_id', type: 'string' },
        { name: 'blob', type: 'string' },
        { name: 'attempts', type: 'number' },
        { name: 'last_attempt_at', type: 'number' },
        { name: 'created_at', type: 'number', isOptional: true },
        { name: 'updated_at', type: 'number', isOptional: true },
      ],
    }),
  ],
});
