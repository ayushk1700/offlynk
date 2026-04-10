import {
  initialize,
  startDiscoveringPeers,
  subscribeOnPeersUpdates,
} from 'react-native-wifi-p2p';
import { Transport, TransportPacket, TransportType } from './types';

class WiFiDirectTransport implements Transport {
  type = TransportType.WiFiDirect;
  private isInitialized = false;
  private peersAvailable = false;

  async isAvailable(): Promise<boolean> {
    try {
      if (!this.isInitialized) {
        await initialize();
        this.isInitialized = true;
        // Start discovering and track whether any peers actually exist
        await startDiscoveringPeers();
        subscribeOnPeersUpdates(({ devices }) => {
          this.peersAvailable = devices.length > 0;
          console.log(`[WiFiDirect] Peers found: ${devices.length}`);
        });
      }
      // FIX: was always returning `true` regardless of peer availability,
      // causing packets to be silently dropped instead of queued to outbox.
      return this.peersAvailable;
    } catch {
      return false;
    }
  }

  async send(packet: TransportPacket): Promise<boolean> {
    if (!this.peersAvailable) return false;
    console.log(`[WiFiDirect] High-bandwidth send for packet ${packet.id}`);
    // TODO: Implement native P2P socket send of the Signal blob
    return false; // Stub — returns false so outbox queuing still occurs
  }

  onMessage(callback: (packet: TransportPacket) => void): void {
    // TODO: Listen for incoming P2P connections and read Signal packets
  }
}

export const wifiDirectTransport = new WiFiDirectTransport();
