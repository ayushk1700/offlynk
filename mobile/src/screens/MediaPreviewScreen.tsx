import React, { useState } from 'react';
import { View, Text, Image, TextInput, TouchableOpacity, StyleSheet, Switch } from 'react-native';
import { useAppTheme } from '../store/themeStore';
import { Check, X, HardDrive } from 'lucide-react-native';

interface Props {
  uri: string;
  type: 'image' | 'video';
  onSend: (caption: string, isHD: boolean) => void;
  onCancel: () => void;
}

export default function MediaPreviewScreen({ uri, type, onSend, onCancel }: Props) {
  const { colors } = useAppTheme();
  const [caption, setCaption] = useState('');
  const [isHD, setIsHD] = useState(false);

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={onCancel}>
          <X color={colors.text} size={28} />
        </TouchableOpacity>
        
        <View style={styles.hdRow}>
          <HardDrive size={18} color={isHD ? colors.primary : colors.textMuted} />
          <Text style={{ color: isHD ? colors.primary : colors.textMuted, marginLeft: 5 }}>HD</Text>
          <Switch value={isHD} onValueChange={setIsHD} />
        </View>
      </View>

      <Image source={{ uri }} style={styles.preview} resizeMode="contain" />

      <View style={styles.footer}>
        <TextInput
          style={[styles.input, { color: colors.text, backgroundColor: colors.card }]}
          placeholder="Add a caption..."
          placeholderTextColor="#64748B"
          value={caption}
          onChangeText={setCaption}
        />
        <TouchableOpacity 
          style={[styles.sendBtn, { backgroundColor: colors.primary }]}
          onPress={() => onSend(caption, isHD)}
        >
          <Check color="#0F172A" size={24} />
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    padding: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  hdRow: { flexDirection: 'row', alignItems: 'center' },
  preview: { flex: 1, marginVertical: 20 },
  footer: {
    padding: 20,
    flexDirection: 'row',
    gap: 15,
    alignItems: 'center'
  },
  input: {
    flex: 1,
    height: 50,
    borderRadius: 25,
    paddingHorizontal: 20,
    fontSize: 16
  },
  sendBtn: {
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center'
  }
});
