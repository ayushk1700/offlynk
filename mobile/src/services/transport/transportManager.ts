import AsyncStorage from '@react-native-async-storage/async-storage';
import { Transport, TransportPacket, TransportType } from './types';
import { database } from '../../db';
import Outbox from '../../models/Outbox';

const MAX_RELAY_HOPS = 5;

class TransportManager {
  private transports: Map<TransportType, Transport> = new Map();
  private meshActive: boolean = true;

  registerTransport(transport: Transport) {
    this.transports.set(transport.type, transport);
    transport.onMessage((packet) => this.handleInboundPacket(packet, transport));
  }

  async send(packet: TransportPacket): Promise<boolean> {
    // Priority: WebSocket → WiFi Direct → BLE → Outbox
    const priority: TransportType[] = [
      TransportType.WebSocket,
      TransportType.WiFiDirect,
      TransportType.BLE,
    ];

    for (const type of priority) {
      const transport = this.transports.get(type);
      if (transport && await transport.isAvailable()) {
        const ok = await transport.send(packet).catch(() => false);
        if (ok) return true;
      }
    }

    // Fallback: Store & Forward
    await this.queueToOutbox(packet);
    return false;
  }

  private async handleInboundPacket(packet: TransportPacket, source: Transport) {
    // FIX: was hardcoded as "" — properly fetch user identity
    const myId = await AsyncStorage.getItem('user_id');
    if (!myId) return;

    // A. Packet is for me — pass to message handler
    if (packet.recipientId === myId) {
      // Emit to a global event bus or message processor
      console.log(`[Mesh] Packet ${packet.id} delivered locally`);
      return;
    }

    // B. Relay to other transports (flood-fill with hop guard)
    if (this.meshActive && (packet as any).hopCount < MAX_RELAY_HOPS) {
      const relayed = { ...packet, hopCount: ((packet as any).hopCount ?? 0) + 1 };
      for (const [type, transport] of this.transports.entries()) {
        if (type !== source.type && await transport.isAvailable()) {
          transport.send(relayed).catch(() => {});
        }
      }
    }
  }

  private async queueToOutbox(packet: TransportPacket) {
    try {
      await database.write(async () => {
        await database.get<Outbox>('outbox').create((record) => {
          record.packetId = packet.id;
          record.recipientId = packet.recipientId;
          record.blob = JSON.stringify(packet);
          record.attempts = 0;
          record.lastAttemptAt = Date.now();
        });
      });
      console.log(`[Outbox] Queued packet ${packet.id}`);
    } catch (err) {
      console.error('[Outbox] Failed to queue packet:', err);
    }
  }
}

export const transportManager = new TransportManager();
