import { Model } from '@nozbe/watermelondb';
import { field, date, readonly } from '@nozbe/watermelondb/decorators';

export default class Message extends Model {
  static table = 'messages';

  @field('chat_id') chatId!: string;
  @field('sender_id') senderId!: string;
  @field('type') type!: string;
  @field('content') content!: string; // Encrypted
  @field('status') status!: string;
  @field('is_starred') isStarred!: boolean;
  @date('timestamp') timestamp!: number;
  @readonly @date('created_at') createdAt!: number;
  @date('updated_at') updatedAt!: number;
}
