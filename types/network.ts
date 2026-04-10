// types/network.ts
import { LocalMessage } from '@/store/chatStore';

export type ControlAction = 'delete_message' | 'typing' | 'delivered' | 'read' | 'ack' | 'edit' | 'reaction' | 'view_once';

export interface BasePacket {
    id: string; // Unique packet ID
    timestamp: number;
}

export interface ChatPacket extends BasePacket {
    type: 'chat';
    message: LocalMessage;
}

export interface ControlPacket extends BasePacket {
    type: 'control';
    action: ControlAction;
    targetId: string; // The ID of the message to act upon
    senderId?: string; // Who sent the control packet
    metadata?: {
        content?: string; // For edit
        emoji?: string;   // For reaction
        isRemoving?: boolean; // For reaction toggle
    };
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