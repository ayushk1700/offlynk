import { create } from 'zustand';

interface ConnectionState {
  isScanning: boolean;
  connectedPeersId: string[];
  setScanning: (isScanning: boolean) => void;
  addConnectedPeerId: (id: string) => void;
  removeConnectedPeerId: (id: string) => void;
}

export const useConnectionStore = create<ConnectionState>((set) => ({
  isScanning: false,
  connectedPeersId: [],
  setScanning: (isScanning) => set({ isScanning }),
  addConnectedPeerId: (id) => set((state) => ({
    connectedPeersId: state.connectedPeersId.includes(id) 
      ? state.connectedPeersId 
      : [...state.connectedPeersId, id]
  })),
  removeConnectedPeerId: (id) => set((state) => ({
    connectedPeersId: state.connectedPeersId.filter(p => p !== id)
  }))
}));
