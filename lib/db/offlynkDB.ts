import Dexie, { type Table } from 'dexie';

export interface DBMessage {
  transcript?: any;
  isViewed?: any;
  isViewOnce?: any;
  id: string;          // UUID generated client-side
  peerId?: string;     // Thread identifier
  senderId: string;
  receiverId: string;
  content: string;
  timestamp: number;
  status?: 'pending' | 'sent' | 'delivered' | 'read' | 'failed' | 'sending';
  type: 'text' | 'file' | 'voice' | 'image' | 'system';
  isDeleted?: boolean;
  isEdited?: boolean;
  editedAt?: number;
  expiresAt?: number;
  replyToId?: string;
  fileData?: any;
  reactions?: string;  // JSON string
  isStarred?: boolean; // Phase 2: Bookmark
  hopCount?: number;  // Phase 3: Mesh routing
  updatedAt?: number;  // Sync timestamp
}

export interface DBPeer {
  id: string;
  name: string;
  publicKey: string;
  isOnline: boolean;
  lastSeen?: number;
  unreadCount: number;
  updatedAt?: number;
  draft?: string;      // Phase 2: Unsent draft
  hops?: number;       // Phase 3: Mesh connectivity
  type?: 'private' | 'group' | 'broadcast';
  participants?: string[]; // Phase 2: Mesh group members
  did?: string;            // Sync identity
}

export class OfflynkDB extends Dexie {
  messages!: Table<DBMessage>;
  peers!: Table<DBPeer>;

  constructor() {
    super('OfflynkDB');
    this.version(1).stores({
      messages: 'id, peerId, senderId, receiverId, timestamp, status, updatedAt',
      peers: 'id, name, isOnline, lastSeen, updatedAt'
    });
    this.version(2).stores({
      messages: 'id, peerId, senderId, receiverId, timestamp, status, updatedAt, [peerId+status]'
    });
  }
}

export const db = new OfflynkDB();
