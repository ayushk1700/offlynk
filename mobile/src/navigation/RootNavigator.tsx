import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { NavigationContainer } from '@react-navigation/native';
import { View, ActivityIndicator } from 'react-native';
import ChatListScreen from '../screens/ChatListScreen';
import ChatScreen from '../screens/ChatScreen';
import { useAppTheme } from '../store/themeStore';
import { MessageSquare, Shield, User } from 'lucide-react-native';
import { database } from '../db';
import Chat from '../models/Chat';

const Stack = createStackNavigator();
const Tab = createBottomTabNavigator();

function TabNavigator() {
  const { colors } = useAppTheme();

  return (
    <Tab.Navigator
      screenOptions={{
        tabBarStyle: { backgroundColor: colors.background, borderTopColor: colors.border },
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textMuted,
        headerStyle: { backgroundColor: colors.background, borderBottomColor: colors.border },
        headerTitleStyle: { color: colors.text, fontWeight: '900' },
      }}
    >
      <Tab.Screen
        name="Chats"
        component={ChatListScreen}
        options={{
          tabBarIcon: ({ color, size }) => <MessageSquare color={color} size={size} />,
          headerTitle: 'OFFLYNK',
        }}
      />
      <Tab.Screen
        name="Identity"
        component={ChatListScreen} // Placeholder
        options={{
          tabBarIcon: ({ color, size }) => <Shield color={color} size={size} />,
          headerTitle: 'YOUR KEYS',
        }}
      />
      <Tab.Screen
        name="Profile"
        component={ChatListScreen} // Placeholder
        options={{
          tabBarIcon: ({ color, size }) => <User color={color} size={size} />,
          headerTitle: 'SETTINGS',
        }}
      />
    </Tab.Navigator>
  );
}

/**
 * FIX: ChatRoomLoader bridges the navigation params gap.
 *
 * ChatScreen is wrapped by withObservables and expects a live
 * WatermelonDB `chat` record prop — it cannot receive route.params directly.
 * This component fetches the record by chatId and passes it to ChatScreen.
 */
function ChatRoomLoader({ route }: any) {
  const { colors } = useAppTheme();
  const { chatId } = route.params as { chatId: string; title: string };

  const [chat, setChat] = React.useState<Chat | null>(null);

  React.useEffect(() => {
    database
      .get<Chat>('chats')
      .find(chatId)
      .then(setChat)
      .catch((err) => console.error('[ChatRoomLoader] Failed to load chat:', err));
  }, [chatId]);

  if (!chat) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.background }}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  return <ChatScreen chat={chat} />;
}

export default function RootNavigator() {
  const { colors } = useAppTheme();

  return (
    <NavigationContainer>
      <Stack.Navigator
        screenOptions={{
          headerStyle: { backgroundColor: colors.background, borderBottomColor: colors.border },
          headerTitleStyle: { color: colors.text },
          headerTintColor: colors.primary,
        }}
      >
        <Stack.Screen
          name="Main"
          component={TabNavigator}
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="ChatRoom"
          component={ChatRoomLoader}
          options={({ route }: any) => ({ title: route.params?.title || 'Chat' })}
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
