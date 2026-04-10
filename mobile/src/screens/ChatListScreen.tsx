import React from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet } from 'react-native';
import withObservables from '@nozbe/with-observables';
import { map } from 'rxjs/operators'; // FIX: proper RxJS operator
import { database } from '../db';
import Chat from '../models/Chat';
import { useAppTheme } from '../store/themeStore';
import { Globe, Zap } from 'lucide-react-native';
import { formatDistanceToNow } from 'date-fns';

// FIX: use .pipe(map()) instead of non-existent .apply()
const ChatListItem = withObservables(['chat'], ({ chat }: { chat: Chat }) => ({
  chat,
  lastMessage: chat.messages.observe().pipe(
    map((msgs: any[]) => (msgs.length > 0 ? msgs[msgs.length - 1] : null))
  ),
}))(({ chat, lastMessage, onPress }: any) => {
  const { colors, fontScale } = useAppTheme();
  const isRelayed = (chat as any).hops && (chat as any).hops > 1;

  return (
    <TouchableOpacity
      style={[styles.item, { borderBottomColor: colors.border }]}
      onPress={() => onPress(chat)}
      activeOpacity={0.7}
    >
      <View style={[styles.avatar, { backgroundColor: colors.primary + '22' }]}>
        <Text style={[styles.avatarText, { color: colors.primary }]}>
          {(chat.peerId || '?').slice(0, 1).toUpperCase()}
        </Text>
      </View>

      <View style={styles.content}>
        <View style={styles.topRow}>
          <Text style={[styles.name, { color: colors.text, fontSize: 16 * fontScale }]} numberOfLines={1}>
            Peer {chat.peerId?.slice(0, 8) ?? '...'}
          </Text>
          <Text style={[styles.time, { color: colors.textMuted }]}>
            {lastMessage
              ? formatDistanceToNow(new Date(lastMessage.timestamp), { addSuffix: false })
              : ''}
          </Text>
        </View>

        <View style={styles.bottomRow}>
          <Text numberOfLines={1} style={[styles.lastMsg, { color: colors.textMuted, fontSize: 14 * fontScale }]}>
            {lastMessage?.content ?? 'No messages yet'}
          </Text>

          {/* Routing indicator */}
          {isRelayed
            ? <Zap size={12} color={colors.statusMesh} />
            : <Globe size={12} color={colors.statusDirect} />
          }
        </View>
      </View>
    </TouchableOpacity>
  );
});

interface Props {
  chats: Chat[];
  navigation?: any;
}

const ChatListScreen = ({ chats, navigation }: Props) => {
  const { colors } = useAppTheme();

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <FlatList
        data={chats}
        keyExtractor={item => item.id}
        renderItem={({ item }) => (
          <ChatListItem
            chat={item}
            onPress={() => navigation?.navigate('ChatRoom', { chatId: item.id, title: `Peer ${item.peerId?.slice(0, 8)}` })}
          />
        )}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={[styles.emptyText, { color: colors.textMuted }]}>📡 No active chats</Text>
            <Text style={[styles.emptyHint, { color: colors.textMuted }]}>Connect to a peer to start messaging</Text>
          </View>
        }
        ItemSeparatorComponent={() => <View style={{ height: StyleSheet.hairlineWidth, backgroundColor: colors.border }} />}
      />
    </View>
  );
};

const enhance = withObservables([], () => ({
  chats: database.get<Chat>('chats').query().observe(),
}));

export default enhance(ChatListScreen);

const styles = StyleSheet.create({
  container: { flex: 1 },
  item: {
    flexDirection: 'row',
    paddingVertical: 13,
    paddingHorizontal: 16,
    alignItems: 'center',
  },
  avatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  avatarText: { fontSize: 20, fontWeight: 'bold' },
  content: { flex: 1 },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  name: { fontWeight: '600', flex: 1, marginRight: 8 },
  time: { fontSize: 11 },
  bottomRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  lastMsg: { flex: 1, marginRight: 8 },
  empty: { alignItems: 'center', marginTop: 120, gap: 8 },
  emptyText: { fontSize: 18 },
  emptyHint: { fontSize: 13 },
});
