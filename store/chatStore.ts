import { create } from 'zustand';
import { persist } from 'zustand/middleware';

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
    dataUrl?: string;       // base64 for images/small files
    blobUrl?: string;       // object URL for voice
    duration?: number;      // voice message duration (secs)
    transferId?: string;    // for large file tracking
  };
  deletedForEveryone?: boolean;
  deletedLocally?: boolean;
  /** DID of sender: did:offgrid:{userId} */
  did?: string;
}

export interface ChatNode {
  id: string;
  name: string;
  publicKey: string;
  lastSeen?: number;
  isOnline: boolean;
  unreadCount: number;
  /** Decentralized ID */
  did?: string;
}

interface ChatState {
  messages: Message[];
  peers: Record<string, ChatNode>;
  activeChatId: string | null;
  addMessage: (msg: Message) => void;
  updateMessageStatus: (id: string, status: Message['status']) => void;
  addPeer: (peer: ChatNode) => void;
  updatePeerStatus: (id: string, isOnline: boolean) => void;
  setActiveChat: (id: string | null) => void;
  clearChat: (peerId: string) => void;
  markRead: (peerId: string) => void;
  deleteMessageLocally: (id: string) => void;
  deleteMessageForEveryone: (id: string) => void;
}

export const useChatStore = create<ChatState>()(
  persist(
    (set) => ({
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

      addMessage: (msg) =>
        set((state) => {
          // Deduplicate
          if (state.messages.some((m) => m.id === msg.id)) return state;

          const isIncoming = msg.senderId !== state.activeChatId;
          const chatKey =
            msg.receiverId === 'broadcast'
              ? 'broadcast'
              : isIncoming ? msg.senderId : msg.receiverId;

          const isActiveChat =
            chatKey === state.activeChatId ||
            (msg.receiverId === 'broadcast' && state.activeChatId === 'broadcast');

          const updatedPeers = { ...state.peers };
          if (updatedPeers[chatKey]) {
            updatedPeers[chatKey] = {
              ...updatedPeers[chatKey],
              unreadCount: isActiveChat ? 0 : (updatedPeers[chatKey].unreadCount || 0) + 1,
              lastSeen: msg.timestamp,
            };
          }

          return { messages: [...state.messages, msg], peers: updatedPeers };
        }),

      updateMessageStatus: (id, status) =>
        set((state) => ({
          messages: state.messages.map((m) => m.id === id ? { ...m, status } : m),
        })),

      addPeer: (peer) =>
        set((state) => ({
          peers: {
            ...state.peers,
            [peer.id]: {
              ...peer,
              did: peer.did || `did:offgrid:${peer.id}`,
              unreadCount: state.peers[peer.id]?.unreadCount || 0,
              lastSeen: state.peers[peer.id]?.lastSeen || Date.now(),
            },
          },
        })),

      updatePeerStatus: (id, isOnline) =>
        set((state) => {
          if (!state.peers[id]) return state;
          return {
            peers: {
              ...state.peers,
              [id]: { ...state.peers[id], isOnline, lastSeen: isOnline ? Date.now() : state.peers[id].lastSeen },
            },
          };
        }),

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
          return {
            peers: { ...state.peers, [peerId]: { ...state.peers[peerId], unreadCount: 0 } },
          };
        }),

      deleteMessageLocally: (id) =>
        set((state) => ({ messages: state.messages.filter((m) => m.id !== id) })),

      deleteMessageForEveryone: (id) =>
        set((state) => ({
          messages: state.messages.map((m) =>
            m.id === id ? { ...m, content: '', deletedForEveryone: true, fileData: undefined } : m
          ),
        })),
    }),
    { name: 'offgrid-messages-v3' }
  )
);
