import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { useUserStore } from './userStore';
import { set as idbSet, get as idbGet, del as idbDel } from 'idb-keyval';
import { db, type DBMessage, type DBPeer } from '@/lib/db/offlynkDB';

export type LocalMessage = DBMessage;
export type ChatNode = DBPeer;
export type Message = LocalMessage;

interface ChatState {
  messages: Record<string, LocalMessage[]>; // keyed by peerId
  peers: Record<string, ChatNode>;
  activeChatId: string | null;
  typingPeers: Record<string, { isTyping: boolean; liveText?: string }>;
  blockedPeers: Set<string>;

  // Actions
  addMessage: (peerIdOrMsg: string | LocalMessage, maybeMsg?: LocalMessage) => Promise<void>;
  updateMessage: (peerId: string, messageId: string, patch: Partial<LocalMessage>) => void;
  deleteMessage: (peerId: string, messageId: string, deleteType: 'for-me' | 'for-everyone') => void;

  // Legacy support & Other actions
  initialize: () => Promise<void>;
  addPeer: (peer: ChatNode) => Promise<void>;
  updatePeerStatus: (id: string, isOnline: boolean, hops?: number) => Promise<void>;
  setActiveChat: (id: string | null) => void;
  setTyping: (peerId: string, isTyping: boolean, liveText?: string) => void;
  markRead: (peerId: string) => void;
  clearChat: (peerId: string) => void;
  purgeExpired: () => void;
  flushPending: (peerId: string) => Promise<void>;
  addTranscript: (peerId: string, messageId: string, transcript: string) => void;
  updateMessageStatus: (messageId: string, status: LocalMessage["status"]) => void;
  deleteMessageForEveryone: (messageId: string) => void;
  executeRemoteControlAction: (action: string, targetId: string) => void;

  // Phase 2 features
  setDraft: (peerId: string, draft: string) => Promise<void>;
  toggleStarMessage: (peerId: string, messageId: string) => Promise<void>;
  addReaction: (peerId: string, messageId: string, reaction: string) => Promise<void>;
  createGroup: (name: string, participants: string[]) => Promise<string>;
}

export const useChatStore = create<ChatState>()(
  persist(
    (set, get) => ({
      messages: {},
      peers: {
        broadcast: {
          id: 'broadcast',
          name: '📡  Emergency Broadcast',
          publicKey: '',
          isOnline: true,
          unreadCount: 0,
          lastSeen: Date.now(),
          updatedAt: Date.now(),
        },
      },
      activeChatId: null,
      typingPeers: {},
      blockedPeers: new Set(),

      addMessage: async (peerIdOrMsg, maybeMsg) => {
        let peerId: string;
        let msg: LocalMessage;

        if (typeof peerIdOrMsg === 'object') {
          msg = peerIdOrMsg as LocalMessage;
          peerId = msg.receiverId === 'broadcast' ? 'broadcast' : (msg.peerId || msg.receiverId);
        } else {
          peerId = peerIdOrMsg;
          msg = maybeMsg!;
        }

        const enrichedMsg: DBMessage = {
          ...msg,
          peerId,
          updatedAt: Date.now(),
          isDeleted: false,
          isEdited: false
        };

        // 1. Commit to Dexie
        await db.messages.put(enrichedMsg);

        // 2. Update UI State
        set((state) => {
          const thread = state.messages[peerId] ?? [];
          if (thread.some((m) => m.id === enrichedMsg.id)) return state;

          const myId = useUserStore.getState().currentUser?.id;
          const isActiveChat = peerId === state.activeChatId;
          const updatedPeers = { ...state.peers };

          if (updatedPeers[peerId]) {
            updatedPeers[peerId] = {
              ...updatedPeers[peerId],
              unreadCount: isActiveChat || enrichedMsg.senderId === myId ? 0 : (updatedPeers[peerId].unreadCount || 0) + 1,
              lastSeen: enrichedMsg.timestamp,
              updatedAt: Date.now()
            };
          }

          return {
            messages: { ...state.messages, [peerId]: [...thread, enrichedMsg] },
            peers: updatedPeers,
          };
        });

        // 3. (Optional) Auto-flush if peer is online
        const rtcPeer = (window as any).peersInstance?.[peerId];
        if (rtcPeer?.connected) {
          get().flushPending(peerId);
        }
      },

      flushPending: async (peerId) => {
        const pending = await db.messages
          .where({ peerId, status: 'pending' })
          .sortBy('timestamp');

        const rtcPeer = (window as any).peersInstance?.[peerId];
        if (!rtcPeer || !rtcPeer.connected) return;

        for (const msg of pending) {
          try {
            const { serializeMessage } = await import('@/lib/webrtc/dataChannel');
            rtcPeer.send(serializeMessage({
              type: 'message',
              id: msg.id,
              senderId: msg.senderId,
              timestamp: msg.timestamp,
              content: msg.content
            }));

            await db.messages.update(msg.id, { status: 'sent', updatedAt: Date.now() });
            get().updateMessage(peerId, msg.id, { status: 'sent' });
          } catch (e) {
            console.error('[Sync] Failed to flush message:', msg.id, e);
          }
        }
      },

      updateMessage: async (peerId, messageId, patch) => {
        const thread = get().messages[peerId] ?? [];
        const existing = thread.find((m) => m.id === messageId);
        if (!existing) return;

        // Last Write Wins guard for edits
        if (
          patch.editedAt !== undefined &&
          existing.editedAt !== undefined &&
          patch.editedAt <= (existing.editedAt || 0)
        ) {
          return; // stale edit — discard
        }

        const updatedAt = Date.now();
        await db.messages.update(messageId, { ...patch, updatedAt });

        set((state) => {
          const thread = state.messages[peerId] ?? [];
          const idx = thread.findIndex((m) => m.id === messageId);
          if (idx === -1) return state;

          const updated = [...thread];
          updated[idx] = { ...existing, ...patch, updatedAt };
          return {
            messages: { ...state.messages, [peerId]: updated },
          };
        });
      },

      deleteMessage: async (peerId, messageId, deleteType) => {
        if (deleteType === 'for-me') {
          await db.messages.delete(messageId);
          set((state) => ({
            messages: { ...state.messages, [peerId]: (state.messages[peerId] || []).filter(m => m.id !== messageId) }
          }));
        } else {
          const updatedAt = Date.now();
          await db.messages.update(messageId, { isDeleted: true, updatedAt });
          set((state) => {
            const thread = state.messages[peerId] ?? [];
            const idx = thread.findIndex(m => m.id === messageId);
            if (idx === -1) return state;
            const updated = [...thread];
            updated[idx] = { ...updated[idx], isDeleted: true, updatedAt };
            return { messages: { ...state.messages, [peerId]: updated } };
          });
        }
      },

      addPeer: async (peer) => {
        const enrichedPeer = { ...peer, updatedAt: Date.now(), isOnline: peer.isOnline };
        await db.peers.put(enrichedPeer as any);
        set((state) => ({
          peers: { ...state.peers, [peer.id]: enrichedPeer as any },
        }));
      },

      updatePeerStatus: async (id, isOnline, hops) => {
        const peer = get().peers[id];
        if (!peer) return;

        const updatedHops = isOnline ? (hops ?? 1) : peer.hops;
        const updated = { ...peer, isOnline, hops: updatedHops, lastSeen: Date.now(), updatedAt: Date.now() };
        await db.peers.update(id, updated as any);

        set((state) => ({
          peers: { ...state.peers, [id]: updated },
        }));

        if (isOnline) {
          get().flushPending(id);
        }
      },

      setActiveChat: (id) =>
        set((state) => {
          if (!id) return { activeChatId: null };
          const updatedPeers = { ...state.peers };
          if (updatedPeers[id]) updatedPeers[id] = { ...updatedPeers[id], unreadCount: 0 };
          return { activeChatId: id, peers: updatedPeers };
        }),

      setTyping: (peerId, isTyping, liveText) =>
        set((state) => ({
          typingPeers: { ...state.typingPeers, [peerId]: { isTyping, liveText } },
        })),

      markRead: (peerId) =>
        set((state) => {
          if (!state.peers[peerId]) return state;
          return { peers: { ...state.peers, [peerId]: { ...state.peers[peerId], unreadCount: 0 } } };
        }),

      clearChat: (peerId) =>
        set((state) => {
          const { [peerId]: _, ...rest } = state.messages;
          return { messages: rest };
        }),

      initialize: async () => {
        const peers = await db.peers.toArray();
        const peermap: Record<string, ChatNode> = {};
        peers.forEach((p) => (peermap[p.id] = p));

        const messages = await db.messages.toArray();
        const msgmap: Record<string, LocalMessage[]> = {};
        messages.forEach((m) => {
          const pid = m.peerId || m.receiverId;
          if (!msgmap[pid]) msgmap[pid] = [];
          msgmap[pid].push(m);
        });

        // Sort each thread by timestamp
        Object.keys(msgmap).forEach((pid) => {
          msgmap[pid].sort((a, b) => a.timestamp - b.timestamp);
        });

        set({ peers: peermap, messages: msgmap });
      },

      purgeExpired: () =>
        set((state) => {
          const now = Date.now();
          const newMessages = { ...state.messages };
          let changed = false;

          Object.keys(newMessages).forEach((peerId) => {
            const thread = newMessages[peerId];
            const filtered = thread.filter((m) => !m.expiresAt || m.expiresAt > now);
            if (filtered.length !== thread.length) {
              newMessages[peerId] = filtered;
              changed = true;
            }
          });

          return changed ? { messages: newMessages } : state;
        }),

      addTranscript: (peerId, messageId, transcript) =>
        set((state) => {
          const thread = state.messages[peerId] ?? [];
          const updated = thread.map((m) => m.id === messageId ? { ...m, transcript } : m);
          return { messages: { ...state.messages, [peerId]: updated } };
        }),

      updateMessageStatus: (messageId, status) =>
        set((state) => {
          for (const [peerId, thread] of Object.entries(state.messages)) {
            const idx = thread.findIndex((m) => m.id === messageId);
            if (idx === -1) continue;

            const updated = [...thread];
            updated[idx] = { ...updated[idx], status };
            return { messages: { ...state.messages, [peerId]: updated } };
          }
          return state;
        }),

      deleteMessageForEveryone: (messageId) =>
        set((state) => {
          for (const [peerId, thread] of Object.entries(state.messages)) {
            const idx = thread.findIndex((m) => m.id === messageId);
            if (idx === -1) continue;

            idbDel(`file_${messageId}`);
            const updated = [...thread];
            updated[idx] = {
              ...updated[idx],
              content: 'This message was deleted.',
              isDeleted: true,
              fileData: undefined,
            };
            return { messages: { ...state.messages, [peerId]: updated } };
          }
          return state;
        }),

      executeRemoteControlAction: (action, targetId) => {
        if (action === 'delete_message') {
          get().deleteMessageForEveryone(targetId);
          return;
        }

        if (action === 'read' || action === 'delivered') {
          get().updateMessageStatus(
            targetId,
            action === 'read' ? 'read' : 'delivered'
          );
        }
      },

      setDraft: async (peerId, draft) => {
        const peer = get().peers[peerId];
        if (!peer) return;

        const updated = { ...peer, draft, updatedAt: Date.now() };
        await db.peers.update(peerId, { draft, updatedAt: Date.now() });

        set((state) => ({
          peers: { ...state.peers, [peerId]: updated }
        }));
      },

      toggleStarMessage: async (peerId, messageId) => {
        const thread = get().messages[peerId] ?? [];
        const existing = thread.find(m => m.id === messageId);
        if (!existing) return;

        const isStarred = !existing.isStarred;
        await db.messages.update(messageId, { isStarred, updatedAt: Date.now() });

        set((state) => {
          const thread = state.messages[peerId] ?? [];
          const idx = thread.findIndex((m) => m.id === messageId);
          if (idx === -1) return state;

          const updated = [...thread];
          updated[idx] = { ...existing, isStarred };
          return { messages: { ...state.messages, [peerId]: updated } };
        });
      },

      addReaction: async (peerId, messageId, reaction) => {
        const thread = get().messages[peerId] ?? [];
        const existing = thread.find(m => m.id === messageId);
        if (!existing) return;

        const myId = useUserStore.getState().currentUser?.id;
        if (!myId) return;

        let reactionsObj: Record<string, string[]> = {};
        if (existing.reactions) {
          try { reactionsObj = JSON.parse(existing.reactions); } catch (e) { }
        }

        const userReactions = reactionsObj[reaction] || [];
        if (!userReactions.includes(myId)) {
          reactionsObj[reaction] = [...userReactions, myId];
        }

        const newReactions = JSON.stringify(reactionsObj);
        await db.messages.update(messageId, { reactions: newReactions, updatedAt: Date.now() });

        set((state) => {
          const thread = state.messages[peerId] ?? [];
          const idx = thread.findIndex((m) => m.id === messageId);
          if (idx === -1) return state;

          const updated = [...thread];
          updated[idx] = { ...existing, reactions: newReactions };
          return { messages: { ...state.messages, [peerId]: updated } };
        });
      },

      createGroup: async (name, participants) => {
        const id = `group-${crypto.randomUUID()}`;
        const group: ChatNode = {
          id,
          name,
          participants,
          type: 'group',
          publicKey: '',
          isOnline: true,
          unreadCount: 0,
          lastSeen: Date.now(),
          updatedAt: Date.now(),
        };

        await db.peers.put(group);
        set((state) => ({
          peers: { ...state.peers, [id]: group }
        }));
        return id;
      },
    }),
    {
      name: 'offlynk-chat-v5',
      partialize: (state) => ({
        messages: state.messages,
        peers: state.peers,
        blockedPeers: Array.from(state.blockedPeers),
      }),
      // @ts-ignore
      onRehydrateStorage: () => (state) => {
        if (state && Array.isArray(state.blockedPeers)) {
          state.blockedPeers = new Set(state.blockedPeers);
        }
      },
    }
  )
);
