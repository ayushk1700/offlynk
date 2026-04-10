import React from 'react';
import { View, Text, Image, StyleSheet, TouchableOpacity } from 'react-native';
import { useAppTheme } from '../store/themeStore';
import { FileText, Play, Mic, MapPin } from 'lucide-react-native';

interface Props {
  type: 'image' | 'video' | 'doc' | 'voice' | 'location';
  uri?: string;
  caption?: string;
  isMe: boolean;
}

export default function MediaBubble({ type, uri, caption, isMe }: Props) {
  const { colors } = useAppTheme();

  return (
    <View style={[styles.container, isMe ? styles.myContainer : styles.theirContainer]}>
      <View style={[
        styles.bubble,
        { backgroundColor: isMe ? colors.bubbleSent : colors.bubbleReceived }
      ]}>
        
        {/* Render based on type */}
        {type === 'image' && (
          <Image source={{ uri }} style={styles.image} />
        )}

        {type === 'doc' && (
          <View style={styles.docRow}>
            <FileText color={isMe ? '#FFF' : colors.primary} size={24} />
            <Text style={[styles.docName, { color: isMe ? '#FFF' : colors.text }]}>Document.pdf</Text>
          </View>
        )}

        {type === 'voice' && (
          <View style={styles.voiceRow}>
             <Mic color={isMe ? '#FFF' : colors.primary} size={24} />
             <View style={styles.waveformPlaceholder} />
             <Text style={{ color: isMe ? '#FFF' : colors.text, fontSize: 10 }}>0:12</Text>
          </View>
        )}

        {type === 'location' && (
          <View style={styles.locationBox}>
            <MapPin color={isMe ? '#FFF' : colors.secondary} size={20} />
            <Text style={{ color: isMe ? '#FFF' : colors.text, marginLeft: 5 }}>Shared Location</Text>
          </View>
        )}

        {caption && (
          <Text style={[styles.caption, { color: isMe ? '#FFF' : colors.text }]}>{caption}</Text>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { marginBottom: 15, width: '100%' },
  myContainer: { alignItems: 'flex-end' },
  theirContainer: { alignItems: 'flex-start' },
  bubble: {
    borderRadius: 20,
    overflow: 'hidden',
    maxWidth: '85%',
    padding: 4
  },
  image: { width: 250, height: 250, borderRadius: 16 },
  docRow: { flexDirection: 'row', alignItems: 'center', padding: 12, gap: 10 },
  docName: { fontWeight: 'bold', fontSize: 14 },
  voiceRow: { flexDirection: 'row', alignItems: 'center', padding: 12, gap: 10, width: 200 },
  waveformPlaceholder: { flex: 1, height: 2, backgroundColor: 'rgba(255,255,255,0.3)' },
  locationBox: { flexDirection: 'row', alignItems: 'center', padding: 12, width: 200 },
  caption: { padding: 10, fontSize: 14 }
});
