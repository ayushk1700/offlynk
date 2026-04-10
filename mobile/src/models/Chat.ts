import { Model, Relation } from '@nozbe/watermelondb';
import { field, date, relation, children } from '@nozbe/watermelondb/decorators';

export default class Chat extends Model {
  static table = 'chats';
  static associations = {
    messages: { type: 'has_many', foreignKey: 'chat_id' },
  } as const;

  @field('peer_id') peerId!: string;
  @field('is_locked') isLocked!: boolean;
  @field('disappearing_timer') disappearingTimer!: number;
  @field('wallpaper') wallpaper?: string;
  @field('theme_color') themeColor?: string;
  @field('layout_density') layoutDensity?: string;
  @date('updated_at') updatedAt!: number;

  @children('messages') messages!: any;
}
