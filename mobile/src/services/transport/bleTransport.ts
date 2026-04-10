import { BleManager } from 'react-native-ble-plx';
import { Transport, TransportPacket, TransportType } from './types';
import { Platform, PermissionsAndroid } from 'react-native';

const SERVICE_UUID = '0000aaaa-0000-1000-8000-00805f9b34fb'; // OffLynk Mesh Service
const CHARACTERISTIC_UUID = '0000bbbb-0000-1000-8000-00805f9b34fb';

class BLETransport implements Transport {
  type = TransportType.BLE;
  private manager: BleManager;
  private messageCallback: ((packet: TransportPacket) => void) | null = null;

  constructor() {
    this.manager = new BleManager();
  }

  async isAvailable(): Promise<boolean> {
    const state = await this.manager.state();
    return state === 'PoweredOn';
  }

  async send(packet: TransportPacket): Promise<boolean> {
    try {
      console.log(`[BLE] Attempting send to ${packet.recipientId}`);
      // TODO: Scan for peer advertising OffLynk Service UUID, connect, and write characteristic
      return false; // Stub — triggers outbox fallback
    } catch {
      return false;
    }
  }

  onMessage(callback: (packet: TransportPacket) => void): void {
    this.messageCallback = callback;
    // TODO: Register characteristic notification listener for inbound packets
  }

  async startDiscovery() {
    // FIX: Android 12+ (API 31+) requires BLUETOOTH_SCAN and BLUETOOTH_CONNECT
    // permissions in addition to ACCESS_FINE_LOCATION.
    if (Platform.OS === 'android') {
      const apiLevel = parseInt(Platform.Version as string, 10);

      if (apiLevel >= 31) {
        // Android 12+
        const granted = await PermissionsAndroid.requestMultiple([
          PermissionsAndroid.PERMISSIONS.BLUETOOTH_SCAN,
          PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT,
          PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
        ]);

        const allGranted = Object.values(granted).every(
          (v) => v === PermissionsAndroid.RESULTS.GRANTED
        );
        if (!allGranted) {
          console.warn('[BLE] One or more Bluetooth permissions denied.');
          return;
        }
      } else {
        // Android < 12
        const result = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION
        );
        if (result !== PermissionsAndroid.RESULTS.GRANTED) {
          console.warn('[BLE] Location permission denied.');
          return;
        }
      }
    }

    this.manager.startDeviceScan([SERVICE_UUID], null, (error, device) => {
      if (error) {
        console.error('[BLE] Scan error:', error.message);
        return;
      }
      if (device) {
        console.log(`[BLE] Found OffLynk Peer: ${device.name} (${device.id})`);
        // TODO: Add to mesh availability map and connect
      }
    });
  }
}

export const bleTransport = new BLETransport();
