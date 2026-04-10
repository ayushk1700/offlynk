import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  FlatList, StyleSheet, KeyboardAvoidingView, Platform
} from 'react-native';
import withObservables from '@nozbe/with-observables';
import { sendMessage } from '../services/messageService';
import { database } from '../db';
import Message from '../models/Message';
import { useAppTheme } from '../store/themeStore'; // FIX: was missing

interface ChatScreenProps {
  chat: any;
  messages: Message[];
}

const ChatScreen = ({ chat, messages }: ChatScreenProps) => {
  const [inputText, setInputText] = useState('');
  const { colors, fontScale } = useAppTheme();

  // Phase 2: Hyper-personalization overrides
  const chatPrimary = chat.themeColor ?? colors.bubbleSent;
  const itemSpacing = chat.layoutDensity === 'compact' ? 4 : 12;

  const handleSend = async () => {
    if (!inputText.trim()) return;
    const text = inputText.trim();
    setInputText('');
    try {
      await sendMessage(chat.peerId, text);
    } catch (err) {
      console.error('[ChatScreen] Send failed:', err);
      setInputText(text); // restore on failure
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={[styles.container, { backgroundColor: chat.wallpaper ?? colors.background }]}
    >
      <FlatList
        data={messages}
        keyExtractor={item => item.id}
        inverted
        renderItem={({ item }) => (
          <View style={[
            styles.bubble,
            item.senderId === 'me' ? styles.myBubble : styles.theirBubble,
            {
              marginBottom: itemSpacing,
              backgroundColor: item.senderId === 'me'
                ? chatPrimary
                : colors.bubbleReceived
            }
          ]}>
            <Text style={[styles.bubbleText, { color: colors.text, fontSize: 16 * fontScale }]}>
              {item.content}
            </Text>
          </View>
        )}
        contentContainerStyle={styles.list}
      />

      <View style={[styles.inputBar, { borderTopColor: colors.border, backgroundColor: colors.background }]}>
        <TextInput
          style={[styles.input, { color: colors.text, backgroundColor: colors.card }]}
          value={inputText}
          onChangeText={setInputText}
          placeholder="Encrypted message..."
          placeholderTextColor={colors.textMuted}
          returnKeyType="send"
          onSubmitEditing={handleSend}
        />
        <TouchableOpacity
          style={[styles.sendButton, { backgroundColor: colors.primary }]}
          onPress={handleSend}
          disabled={!inputText.trim()}
        >
          <Text style={styles.sendText}>↑</Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
};

// WatermelonDB reactive enhancement
const enhance = withObservables(['chat'], ({ chat }: { chat: any }) => ({
  chat,
  messages: chat.messages.observe(),
}));

export default enhance(ChatScreen);

const styles = StyleSheet.create({
  container: { flex: 1 },
  list: { padding: 16, paddingBottom: 8 },
  bubble: {
    padding: 12,
    borderRadius: 18,
    maxWidth: '80%',
  },
  myBubble: { alignSelf: 'flex-end', borderBottomRightRadius: 4 },
  theirBubble: { alignSelf: 'flex-start', borderBottomLeftRadius: 4 },
  bubbleText: { lineHeight: 22 },
  inputBar: {
    flexDirection: 'row',
    padding: 10,
    borderTopWidth: 1,
    alignItems: 'center',
    gap: 10,
  },
  input: {
    flex: 1,
    borderRadius: 24,
    paddingHorizontal: 16,
    height: 46,
    fontSize: 16,
  },
  sendButton: {
    width: 46,
    height: 46,
    borderRadius: 23,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendText: { color: '#fff', fontSize: 20, fontWeight: 'bold' },
});
