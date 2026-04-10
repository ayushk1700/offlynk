import * as libsignal from 'libsignal-protocol';
import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * OffLynk Signal Protocol Service
 * Manages identity keys, pre-keys, and X3DH sessions.
 */
class EncryptionService {
  private store: any;

  constructor() {
    this.store = new SignalProtocolStore();
  }

  // Identity logic
  async generateIdentity() {
    const registrationId = libsignal.KeyHelper.generateRegistrationId();
    const identityKeyPair = await libsignal.KeyHelper.generateIdentityKeyPair();
    
    await this.store.put('registrationId', registrationId);
    await this.store.put('identityKey', identityKeyPair);

    return { registrationId, identityKeyPair };
  }

  async generatePreKeys(startId: number, count: number) {
    const keys = [];
    for (let i = 0; i < count; i++) {
      const keyId = startId + i;
      const keyPair = await libsignal.KeyHelper.generatePreKey(keyId);
      keys.push(keyPair);
      await this.store.storePreKey(keyId, keyPair.keyPair);
    }
    return keys;
  }

  async generateSignedPreKey(identityKeyPair: any, signedPreKeyId: number) {
    const signedPreKey = await libsignal.KeyHelper.generateSignedPreKey(identityKeyPair, signedPreKeyId);
    await this.store.storeSignedPreKey(signedPreKeyId, signedPreKey.keyPair);
    return signedPreKey;
  }

  // X3DH: Process recipient pre-key bundle
  async establishSession(recipientId: string, bundle: any) {
    const address = new libsignal.SignalProtocolAddress(recipientId, 1);
    const builder = new libsignal.SessionBuilder(this.store, address);

    const preKeyBundle = {
      registrationId: bundle.registrationId,
      identityKey: JSON.parse(bundle.identityKey),
      signedPreKey: {
        keyId: bundle.signedPreKey.key_id,
        publicKey: JSON.parse(bundle.signedPreKey.key),
        signature: JSON.parse(bundle.signedPreKey.signature)
      },
      preKey: bundle.preKey ? {
        keyId: bundle.preKey.key_id,
        publicKey: JSON.parse(bundle.preKey.key)
      } : undefined
    };

    await builder.processPreKey(preKeyBundle);
    return true;
  }

  // Encrypt with session check
  async encrypt(recipientId: string, content: string, bundleFallback?: any) {
    const address = new libsignal.SignalProtocolAddress(recipientId, 1);
    
    // If no session exists, we must establish it first via X3DH
    const hasSession = await this.store.loadSession(address.toString());
    if (!hasSession && bundleFallback) {
      await this.establishSession(recipientId, bundleFallback);
    }

    const sessionCipher = new libsignal.SessionCipher(this.store, address);
    const message = await sessionCipher.encrypt(new TextEncoder().encode(content));
    return message; // { type, body }
  }

  // Decrypt
  async decrypt(senderId: string, message: any) {
    const address = new libsignal.SignalProtocolAddress(senderId, 1);
    const sessionCipher = new libsignal.SessionCipher(this.store, address);
    
    let buffer;
    if (message.type === 3) { // PreKeySignalMessage
       buffer = await sessionCipher.decryptPreKeyWhisperMessage(message.body, 'binary');
    } else {
       buffer = await sessionCipher.decryptWhisperMessage(message.body, 'binary');
    }
    return new TextDecoder().decode(buffer);
  }
}

/**
 * Persistent Signal Protocol Store (AsyncStorage-backed)
 * FIX: was in-memory Map — all sessions and keys were lost on app restart.
 * NOTE: For production, migrate private key blobs to expo-secure-store / Keychain.
 */
class SignalProtocolStore {
  private prefix = '@offlynk_signal:';

  private key(k: string) { return `${this.prefix}${k}`; }

  async get(k: string, defaultValue?: any) {
    const raw = await AsyncStorage.getItem(this.key(k));
    return raw ? JSON.parse(raw) : defaultValue;
  }

  async put(k: string, value: any) {
    await AsyncStorage.setItem(this.key(k), JSON.stringify(value));
  }

  // Identity Keys
  async getIdentityKeyPair() { return this.get('identityKey'); }
  async getLocalRegistrationId() { return this.get('registrationId'); }

  // PreKeys
  async loadPreKey(id: number) { return this.get(`25519KeypreKey${id}`); }
  async storePreKey(id: number, keyPair: any) { await this.put(`25519KeypreKey${id}`, keyPair); }
  async removePreKey(id: number) { await AsyncStorage.removeItem(this.key(`25519KeypreKey${id}`)); }

  // Signed PreKeys
  async loadSignedPreKey(id: number) { return this.get(`25519KeysignedPreKey${id}`); }
  async storeSignedPreKey(id: number, keyPair: any) { await this.put(`25519KeysignedPreKey${id}`, keyPair); }
  async removeSignedPreKey(id: number) { await AsyncStorage.removeItem(this.key(`25519KeysignedPreKey${id}`)); }

  // Sessions
  async loadSession(identifier: string) { return this.get(`session${identifier}`); }
  async storeSession(identifier: string, record: any) { await this.put(`session${identifier}`, record); }
  async removeSession(identifier: string) { await AsyncStorage.removeItem(this.key(`session${identifier}`)); }

  // Sender Keys
  async loadSenderKey(identifier: string) { return this.get(`senderKey${identifier}`); }
  async storeSenderKey(identifier: string, record: any) { await this.put(`senderKey${identifier}`, record); }

  // Trusted identities (TOFU — on first contact, auto-trust)
  async isTrustedIdentity(_id: string, _key: any) { return true; }
  async loadIdentity(identifier: string) { return this.get(`identity${identifier}`); }
  async saveIdentity(identifier: string, identityKey: any) { await this.put(`identity${identifier}`, identityKey); }
}

export const encryptionService = new EncryptionService();
