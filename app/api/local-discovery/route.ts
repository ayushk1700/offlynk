import { NextResponse } from 'next/server';
import mdns from 'multicast-dns';
import os from 'os';

// Keep a global instance to persist through HMR in dev mode
let m: any = (global as any).mdnsInstance;
const detectedPeers = new Map<string, { ip: string; name: string; lastSeen: number }>();

function getLocalIp() {
  const interfaces = os.networkInterfaces();
  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name]!) {
      if (iface.family === 'IPv4' && !iface.internal) {
        return iface.address;
      }
    }
  }
  return '127.0.0.1';
}

if (!m) {
  try {
    m = mdns();
    (global as any).mdnsInstance = m;

    m.on('response', (response: any) => {
      response.answers.forEach((answer: any) => {
        if (answer.type === 'TXT' && answer.name === '_offlynk._tcp.local') {
          try {
            const data = JSON.parse(answer.data.toString());
            detectedPeers.set(data.id, {
              ip: data.ip,
              name: data.name,
              lastSeen: Date.now()
            });
          } catch (e) {
            // ignore parse errors
          }
        }
      });
    });

    // Automatically advertise ourselves locally
    setInterval(() => {
      // Clean up stale peers
      const now = Date.now();
      for (const [id, peer] of detectedPeers.entries()) {
        if (now - peer.lastSeen > 15000) {
          detectedPeers.delete(id);
        }
      }
    }, 5000);

  } catch (error) {
    console.error('Failed to start mDNS:', error);
  }
}

export async function POST(req: Request) {
  try {
    const { action, peerId, name } = await req.json();

    if (action === 'advertise' && m) {
      const ip = getLocalIp();
      const payload = JSON.stringify({ id: peerId, name, ip });
      
      m.respond({
        answers: [{
          name: '_offlynk._tcp.local',
          type: 'TXT',
          data: Buffer.from(payload)
        }]
      });

      return NextResponse.json({ success: true, ip });
    }

    if (action === 'scan') {
       // Return currently detected local peers
       const peers = Array.from(detectedPeers.entries()).map(([id, data]) => ({
         id,
         name: data.name,
         ip: data.ip
       }));
       return NextResponse.json({ peers });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (err) {
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
