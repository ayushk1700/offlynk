import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useAppTheme } from '../store/themeStore';
import { Globe, Zap, Clock, ShieldCheck, Lock } from 'lucide-react-native';

interface Props {
  content: string;
  isMe: boolean;
  status: 'sent' | 'delivered' | 'read' | 'queued';
  routing: 'internet' | 'mesh';
  timestamp: number;
}

export default function MessageBubble({ content, isMe, status, routing, timestamp }: Props) {
  const { colors, fontScale } = useAppTheme();

  return (
    <View style={[styles.wrapper, isMe ? styles.myWrapper : styles.theirWrapper]}>
      <View style={[
        styles.bubble, 
        { 
          backgroundColor: isMe ? colors.bubbleSent : colors.bubbleReceived,
          borderBottomRightRadius: isMe ? 4 : 20,
          borderBottomLeftRadius: isMe ? 20 : 4,
        }
      ]}>
        <Text style={[styles.text, { color: isMe ? '#fff' : colors.text, fontSize: 16 * fontScale }]}>
          {content}
        </Text>
        
        <View style={styles.meta}>
          <Text style={[styles.time, { color: isMe ? 'rgba(255,255,255,0.7)' : colors.textMuted }]}>
            12:45
          </Text>
          
          <View style={styles.indicators}>
            {/* E2EE indicator */}
            <Lock size={10} color={isMe ? 'rgba(255,255,255,0.7)' : colors.textMuted} style={styles.icon} />
            
            {/* Routing indicator */}
            {routing === 'mesh' ? (
               <Zap size={10} color={isMe ? '#FFF' : colors.statusMesh} style={styles.icon} />
            ) : (
               <Globe size={10} color={isMe ? '#FFF' : colors.statusDirect} style={styles.icon} />
            )}

            {/* Delivery status */}
            {status === 'read' ? (
                <ShieldCheck size={12} color={isMe ? '#FFF' : colors.secondary} />
            ) : (
                <Clock size={12} color={isMe ? 'rgba(255,255,255,0.7)' : colors.textMuted} />
            )}
          </View>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { marginBottom: 12, width: '100%' },
  myWrapper: { alignItems: 'flex-end' },
  theirWrapper: { alignItems: 'flex-start' },
  bubble: {
    padding: 12,
    borderRadius: 20,
    maxWidth: '85%',
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 1
  },
  text: { lineHeight: 22 },
  meta: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    marginTop: 4,
    gap: 6
  },
  time: { fontSize: 10 },
  indicators: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  icon: { marginRight: 2 }
});
