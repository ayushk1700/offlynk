import { io, Socket } from 'socket.io-client';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { encryptionService } from './encryptionService';
import { database } from '../db';
import Message from '../models/Message';
import Chat from '../models/Chat';
import { Q } from '@nozbe/watermelondb';
import axios from 'axios';

const API_BASE = 'http://localhost:4000/api';
let socket: Socket | null = null;

// ─── Socket Initialization ───────────────────────────────────────────────────

export const initSocket = async () => {
  const userId = await AsyncStorage.getItem('user_id');
  if (!userId) return;

  if (socket?.connected) return; // idempotent

  socket = io('http://localhost:4000', { transports: ['websocket'] });

  socket.on('connect', () => {
    console.log('[Socket] Connected:', socket!.id);
    socket!.emit('join', userId);
  });

  socket.on('disconnect', () => console.log('[Socket] Disconnected'));

  socket.on('new_message', async (message) => {
    try {
      const decrypted = await encryptionService.decrypt(
        message.sender_id,
        JSON.parse(message.content)
      );

      // FIX: Resolve or create the correct chat record for this sender
      // instead of incorrectly using sender_id as chatId.
      let chatId: string;
      const existingChats = await database
        .get<Chat>('chats')
        .query(Q.where('peer_id', message.sender_id))
        .fetch();

      if (existingChats.length > 0) {
        chatId = existingChats[0].id;
      } else {
        // Create a new chat record for this peer
        let newChatId = '';
        await database.write(async () => {
          const newChat = await database.get<Chat>('chats').create((record) => {
            record.peerId = message.sender_id;
            record.isLocked = false;
            record.disappearingTimer = 0;
            record.updatedAt = Date.now();
          });
          newChatId = newChat.id;
        });
        chatId = newChatId;
      }

      // Persist the decrypted message to WatermelonDB
      await database.write(async () => {
        await database.get<Message>('messages').create((record) => {
          record.chatId = chatId;
          record.senderId = message.sender_id;
          record.type = 'text';
          record.content = decrypted;
          record.timestamp = message.timestamp ?? Date.now();
          record.status = 'delivered';
          record.isStarred = false;
        });
      });
    } catch (err) {
      console.error('[Socket] Message handling failed:', err);
    }
  });
};

// ─── Send ─────────────────────────────────────────────────────────────────────

export const sendMessage = async (recipientId: string, text: string) => {
  const senderId = await AsyncStorage.getItem('user_id');
  if (!senderId) throw new Error('Not authenticated');

  // Fetch recipient bundle for X3DH session if needed
  const { data: bundle } = await axios.get(`${API_BASE}/auth/pre-keys/${recipientId}`);

  // Encrypt via Signal Protocol
  const encrypted = await encryptionService.encrypt(recipientId, text, bundle);

  const token = await AsyncStorage.getItem('auth_token');

  const payload = {
    senderId,
    recipientId,
    content: JSON.stringify(encrypted),
    timestamp: Date.now(),
    type: 'text',
  };

  await axios.post(`${API_BASE}/messages/send`, payload, {
    headers: { Authorization: `Bearer ${token}` },
  });
};

// ─── Disappearing Messages Cleanup ───────────────────────────────────────────

export const cleanupExpiredMessages = async () => {
  const chatsCollection = database.get<any>('chats');
  const messagesCollection = database.get<Message>('messages');

  const chats = await chatsCollection.query().fetch();

  for (const chat of chats) {
    if (!chat.disappearingTimer || chat.disappearingTimer <= 0) continue;

    const expiryTs = Date.now() - chat.disappearingTimer * 1000;

    const expired = await messagesCollection
      .query(
        Q.where('chat_id', chat.id),
        Q.where('timestamp', Q.lt(expiryTs))
      )
      .fetch();

    if (expired.length > 0) {
      await database.write(async () => {
        for (const msg of expired) {
          await msg.destroyPermanently();
        }
      });
      console.log(`[Cleanup] Deleted ${expired.length} expired messages in chat ${chat.id}`);
    }
  }
};
