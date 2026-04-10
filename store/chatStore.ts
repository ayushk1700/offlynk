import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { useUserStore } from './userStore';
import { set as idbSet, get as idbGet, del as idbDel } from 'idb-keyval';
import { ControlAction } from '@/types/network';

export interface Message {
  id: string;
  senderId: string;
  receiverId: string | 'broadcast';
  content: string;
  timestamp: number;
  status: 'sending' | 'sent' | 'delivered' | 'read' | 'failed' | 'queued';
  type: 'text' | 'file' | 'voice' | 'image';
  fileData?: {
    name: string;
    size?: number;
    mimeType?: string;
    dataUrl?: string;       // In-memory only (stripped before saving)
    blobUrl?: string;
    duration?: number;
    transferId?: string;
    hasLocalIndexedDb?: boolean; // Flag to indicate heavy data is stored in IDB
  };
  deletedForEveryone?: boolean;
  deletedLocally?: boolean;
  did?: string;
}

export interface ChatNode {
  id: string;
  name: string;
  publicKey: string;
  lastSeen?: number;
  isOnline: boolean;
  unreadCount: number;
  did?: string;
}

interface ChatState {
  messages: Message[];
  peers: Record<string, ChatNode>;
  activeChatId: string | null;
  addMessage: (msg: Message) => Promise<void>; // Upgraded to async for IDB
  updateMessageStatus: (id: string, status: Message['status']) => void;
  addPeer: (peer: ChatNode) => void;
  updatePeerStatus: (id: string, isOnline: boolean) => void;
  setActiveChat: (id: string | null) => void;
  clearChat: (peerId: string) => void;
  markRead: (peerId: string) => void;
  deleteMessageLocally: (id: string) => void;
  deleteMessageForEveryone: (id: string) => void;
  executeRemoteControlAction: (action: ControlAction, targetId: string) => void;
}

export const useChatStore = create<ChatState>()(
  persist(
    (set, get) => ({
      messages: [],
      peers: {
        broadcast: {
          id: 'broadcast',
          name: '📡  Emergency Broadcast',
          publicKey: '',
          isOnline: true,
          unreadCount: 0,
          lastSeen: Date.now(),
        },
      },
      activeChatId: null,

      addMessage: async (msg) => {
        // 1. Offload heavy files to IndexedDB to save LocalStorage
        if (msg.fileData?.dataUrl) {
          await idbSet(`file_${msg.id}`, msg.fileData.dataUrl);
          msg.fileData.hasLocalIndexedDb = true;
          msg.fileData.dataUrl = undefined; // Strip it from memory
        }

        set((state) => {
          // Strict Deduplication based on Crypto ID
          if (state.messages.some((m) => m.id === msg.id)) return state;

          const myId = useUserStore.getState().currentUser?.id;
          const chatKey = msg.receiverId === 'broadcast' ? 'broadcast'
            : msg.senderId === myId ? msg.receiverId : msg.senderId;

          const isActiveChat = chatKey === state.activeChatId;
          const updatedPeers = { ...state.peers };

          if (updatedPeers[chatKey]) {
            updatedPeers[chatKey] = {
              ...updatedPeers[chatKey],
              unreadCount: isActiveChat || msg.senderId === myId ? 0 : (updatedPeers[chatKey].unreadCount || 0) + 1,
              lastSeen: msg.timestamp,
            };
          } else if (chatKey && chatKey !== myId && chatKey !== 'broadcast') {
            updatedPeers[chatKey] = {
              id: chatKey,
              name: `Unknown Peer (${chatKey.substring(0, 4)})`,
              publicKey: '',
              isOnline: true,
              unreadCount: isActiveChat || msg.senderId === myId ? 0 : 1,
              lastSeen: msg.timestamp,
              did: `did:offlynk:${chatKey}`
            };
          }

          return { messages: [...state.messages, msg], peers: updatedPeers };
        });
      },

      updateMessageStatus: (id, status) =>
        set((state) => ({
          messages: state.messages.map((m) => m.id === id ? { ...m, status } : m),
        })),

      addPeer: (peer) =>
        set((state) => {
          const existingPeerId = Object.keys(state.peers).find(
            (key) => key === peer.id || (state.peers[key].publicKey === peer.publicKey && key !== 'broadcast')
          );
          if (existingPeerId) {
            return {
              peers: {
                ...state.peers,
                [existingPeerId]: {
                  ...state.peers[existingPeerId],
                  ...peer,
                  id: existingPeerId,
                  did: peer.did || state.peers[existingPeerId].did || `did:offlynk:${existingPeerId}`,
                  unreadCount: state.peers[existingPeerId].unreadCount || 0,
                  lastSeen: peer.isOnline ? Date.now() : (state.peers[existingPeerId].lastSeen || Date.now()),
                },
              },
            };
          }
          return {
            peers: {
              ...state.peers,
              [peer.id]: { ...peer, did: peer.did || `did:offlynk:${peer.id}`, unreadCount: 0, lastSeen: Date.now() },
            },
          };
        }),

      updatePeerStatus: (id, isOnline) =>
        set((state) => ({
          peers: {
            ...state.peers,
            ...(state.peers[id] && {
              [id]: { ...state.peers[id], isOnline, lastSeen: isOnline ? Date.now() : state.peers[id].lastSeen },
            }),
          },
        })),

      setActiveChat: (id) =>
        set((state) => {
          if (!id) return { activeChatId: null };
          const updatedPeers = { ...state.peers };
          if (updatedPeers[id]) updatedPeers[id] = { ...updatedPeers[id], unreadCount: 0 };
          return { activeChatId: id, peers: updatedPeers };
        }),

      clearChat: (peerId) =>
        set((state) => ({
          messages: state.messages.filter((m) => m.senderId !== peerId && m.receiverId !== peerId),
        })),

      markRead: (peerId) =>
        set((state) => {
          if (!state.peers[peerId]) return state;
          return { peers: { ...state.peers, [peerId]: { ...state.peers[peerId], unreadCount: 0 } } };
        }),

      deleteMessageLocally: (id) => {
        idbDel(`file_${id}`); // Clean up heavy storage
        set((state) => ({ messages: state.messages.filter((m) => m.id !== id) }));
      },

      deleteMessageForEveryone: (id) => {
        idbDel(`file_${id}`); // Clean up heavy storage
        set((state) => ({
          messages: state.messages.map((m) =>
            m.id === id ? { ...m, content: '🚫 This message was deleted', deletedForEveryone: true, fileData: undefined } : m
          ),
        }));
      },

      // SILENT EXECUTOR for WebRTC incoming control packets
      executeRemoteControlAction: (action, targetId) =>
        set((state) => {
          if (action === 'delete_message') {
            idbDel(`file_${targetId}`);
            return {
              messages: state.messages.map((m) =>
                m.id === targetId ? { ...m, content: '🚫 This message was deleted', deletedForEveryone: true, fileData: undefined } : m
              ),
            };
          }
          if (action === 'delivered') {
            return {
              messages: state.messages.map((m) => m.id === targetId ? { ...m, status: 'delivered' } : m),
            };
          }
          if (action === 'read') {
            return {
              messages: state.messages.map((m) => m.id === targetId ? { ...m, status: 'read' } : m),
            };
          }
          if (action === 'ack') {
            return {
              messages: state.messages.map((m) => m.id === targetId && m.status === 'sending' ? { ...m, status: 'sent' } : m),
            };
          }
          return state;
        }),
    }),
    {
      name: 'offlynk-messages-v4',
      // Optional: Prevent saving non-essential states to localstorage
      partialize: (state) => ({
        messages: state.messages,
        peers: state.peers
      }),
    }
  )
);