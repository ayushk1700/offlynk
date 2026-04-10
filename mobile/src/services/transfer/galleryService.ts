import { Q } from '@nozbe/watermelondb';
import { database } from '../../db';

/**
 * Phase 2: In-Chat Media Gallery
 * Efficiently queries historical media for a specific conversation.
 */
export const getChatGallery = async (chatId: string) => {
  const messagesCollection = database.get('messages');
  
  // Query all media-type messages for this chat
  const mediaMessages = await messagesCollection
    .query(
      Q.where('chat_id', chatId),
      Q.where('type', Q.oneOf(['image', 'video', 'doc'])),
      Q.sortBy('timestamp', Q.desc)
    )
    .fetch();

  return mediaMessages.map((msg: any) => ({
    id: msg.id,
    type: msg.type,
    uri: msg.content, // Assuming content stores the encrypted file path
    timestamp: msg.timestamp
  }));
};
