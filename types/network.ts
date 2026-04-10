// types/network.ts
import { Message } from '@/store/chatStore';

export type ControlAction = 'delete_message' | 'typing' | 'delivered' | 'read' | 'ack'; // Make sure to include 'ack' as well!

export interface BasePacket {
    id: string; // Unique packet ID
    timestamp: number;
}

export interface ChatPacket extends BasePacket {
    type: 'chat';
    message: Message;
}

export interface ControlPacket extends BasePacket {
    type: 'control';
    action: ControlAction;
    targetId: string; // The ID of the message to act upon
    senderId?: string; // Optional: helps identify who sent the control packet
}

export interface RelayEnvelope {
    type: "relay";
    messageId: string;
    target: string;
    hops: string[];
    maxHops: number;
    payload: ChatPacket | ControlPacket;
}

export type NetworkPacket = ChatPacket | ControlPacket | RelayEnvelope;