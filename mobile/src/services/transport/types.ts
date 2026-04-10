export enum TransportType {
  WebSocket = 'websocket',
  BLE = 'ble',
  WiFiDirect = 'wifidirect'
}

export interface TransportPacket {
  id: string;
  senderId: string;
  recipientId: string;
  payload: string; // Encrypted Signal blob
  type: 'direct' | 'relay';
}

export interface Transport {
  type: TransportType;
  isAvailable(): Promise<boolean>;
  send(packet: TransportPacket): Promise<boolean>;
  onMessage(callback: (packet: TransportPacket) => void): void;
}
