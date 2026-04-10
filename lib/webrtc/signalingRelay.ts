import mqtt, { MqttClient } from 'mqtt';

const PUBLIC_BROKER = 'wss://broker.emqx.io:8084/mqtt';

export interface SignalingDelegate {
  onOffer: (offer: string, fromUser: any) => void;
  onAnswer: (answer: string, fromUser: any) => void;
  onPresence?: (fromUser: any) => void;
}

export class SignalingRelay {
  private client: MqttClient | null = null;
  private currentTopic: string | null = null;

  async connect(roomCode: string, user: { id: string, name: string }, delegate: SignalingDelegate): Promise<void> {
    const topic = `offlynk/room/${roomCode}`;
    this.currentTopic = topic;

    return new Promise((resolve, reject) => {
      this.client = mqtt.connect(PUBLIC_BROKER);

      this.client.on('connect', () => {
        this.client?.subscribe(topic);
        this.client?.publish(topic, JSON.stringify({
          type: 'presence',
          from: user
        }));
        resolve();
      });

      this.client.on('message', (t, message) => {
        if (t !== topic) return;
        try {
          const payload = JSON.parse(message.toString());
          if (payload.from?.id === user.id) return;

          if (payload.type === 'presence') {
            delegate.onPresence?.(payload.from);
          } else if (payload.type === 'offer' && payload.to === user.id) {
            delegate.onOffer(payload.sdp, payload.from);
          } else if (payload.type === 'answer' && payload.to === user.id) {
            delegate.onAnswer(payload.sdp, payload.from);
          }
        } catch (e) {
          console.error('[SignalingRelay] Malformed message:', e);
        }
      });

      this.client.on('error', (err) => reject(err));
    });
  }

  sendOffer(sdp: string, toPeerId: string, fromUser: any) {
    if (!this.currentTopic) return;
    this.client?.publish(this.currentTopic, JSON.stringify({
      type: 'offer',
      sdp,
      to: toPeerId,
      from: fromUser
    }));
  }

  sendAnswer(sdp: string, toPeerId: string, fromUser: any) {
    if (!this.currentTopic) return;
    this.client?.publish(this.currentTopic, JSON.stringify({
      type: 'answer',
      sdp,
      to: toPeerId,
      from: fromUser
    }));
  }

  disconnect() {
    this.client?.end();
    this.client = null;
    this.currentTopic = null;
  }
}

export const signalingRelay = new SignalingRelay();
