import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { useUserStore } from './userStore';

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

          const myId = useUserStore.getState().currentUser?.id;

          const chatKey =
            msg.receiverId === 'broadcast'
              ? 'broadcast'
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
              did: `did:offgrid:${chatKey}`
            };
          }

          return { messages: [...state.messages, msg], peers: updatedPeers };
        }),

      updateMessageStatus: (id, status) =>
        set((state) => ({
          messages: state.messages.map((m) => m.id === id ? { ...m, status } : m),
        })),

      addPeer: (peer) =>
        set((state) => {
          // 1. Check if we already know this user by their ID OR their Public Key
          const existingPeerId = Object.keys(state.peers).find(
            (key) =>
              key === peer.id ||
              (state.peers[key].publicKey === peer.publicKey && key !== 'broadcast')
          );

          if (existingPeerId) {
            // 2. If they exist, UPDATE the existing profile instead of creating a new one
            return {
              peers: {
                ...state.peers,
                [existingPeerId]: {
                  ...state.peers[existingPeerId],
                  ...peer, // Pull in new network state (like isOnline)
                  id: existingPeerId, // Force the ID to stay the same so chat history links up!
                  did: peer.did || state.peers[existingPeerId].did || `did:offgrid:${existingPeerId}`,
                  unreadCount: state.peers[existingPeerId].unreadCount || 0,
                  lastSeen: peer.isOnline ? Date.now() : (state.peers[existingPeerId].lastSeen || Date.now()),
                },
              },
            };
          }

          // 3. If it's a genuinely new person, add them normally
          return {
            peers: {
              ...state.peers,
              [peer.id]: {
                ...peer,
                did: peer.did || `did:offgrid:${peer.id}`,
                unreadCount: 0,
                lastSeen: Date.now(),
              },
            },
          };
        }),

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
