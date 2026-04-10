import { Model } from '@nozbe/watermelondb';
import { field, date } from '@nozbe/watermelondb/decorators';

export default class Outbox extends Model {
  static table = 'outbox';

  @field('packet_id') packetId!: string;
  @field('recipient_id') recipientId!: string;
  @field('blob') blob!: string;
  @field('attempts') attempts!: number;
  @date('last_attempt_at') lastAttemptAt!: number;
}
