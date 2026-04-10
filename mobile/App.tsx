import React, { useEffect } from 'react';
import { transportManager } from './src/services/transport/transportManager';
import { bleTransport } from './src/services/transport/bleTransport';
import { wifiDirectTransport } from './src/services/transport/wifiDirectTransport';
import { startSyncWorker } from './src/services/transport/syncWorker';
import { initSocket } from './src/services/messageService';
import RootNavigator from './src/navigation/RootNavigator';

export default function App() {
  useEffect(() => {
    const bootstrap = async () => {
      // 1. Initialize off-grid mesh transports
      transportManager.registerTransport(bleTransport);
      transportManager.registerTransport(wifiDirectTransport);
      await bleTransport.startDiscovery();

      // 2. Start the store-and-forward sync worker
      startSyncWorker();

      // 3. Start the online WebSocket listener
      await initSocket();

      console.log('📡 OffLynk bootstrap complete');
    };

    bootstrap().catch(console.error);
  }, []);

  return <RootNavigator />;
}
