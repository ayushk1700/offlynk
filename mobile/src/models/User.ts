import { Model } from '@nozbe/watermelondb';
import { field, date } from '@nozbe/watermelondb/decorators';

export default class User extends Model {
  static table = 'users';

  @field('name') name!: string;
  @field('phone') phone!: string;
  @field('public_key') publicKey!: string;
  @field('identity_key') identityKey!: string;
  @date('last_seen') lastSeen?: number;
}
