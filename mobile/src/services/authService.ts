import axios from 'axios';
import { encryptionService } from './encryptionService';
import AsyncStorage from '@react-native-async-storage/async-storage';

const API_BASE = 'http://localhost:4000/api'; // Replace with server host in production

export const registerUser = async (phone: string, name: string) => {
  try {
    // 1. Generate identity keys locally
    const { registrationId, identityKeyPair } = await encryptionService.generateIdentity();
    
    // 2. Generate pre-keys for server upload (Phase 1 X3DH)
    const preKeys = await encryptionService.generatePreKeys(1, 100);
    const signedPreKey = await encryptionService.generateSignedPreKey(identityKeyPair, 1);
    
    const preKeyBundle = {
      phone,
      name,
      registrationId,
      identityKey: JSON.stringify(identityKeyPair.public),
      publicKey: JSON.stringify(identityKeyPair.public), // simplified for initial sync
      preKeys: preKeys.map(k => ({ id: k.keyId, key: JSON.stringify(k.keyPair.public) })),
      signedPreKey: {
        id: signedPreKey.keyId,
        key: JSON.stringify(signedPreKey.keyPair.public),
        signature: JSON.stringify(signedPreKey.signature)
      }
    };
    
    // 3. Official server registration
    const response = await axios.post(`${API_BASE}/auth/register`, preKeyBundle);
    const { user, token } = response.data;
    
    // 4. Persistence
    await AsyncStorage.setItem('auth_token', token);
    await AsyncStorage.setItem('user_id', user.id);
    
    return { user, token };
  } catch (error: any) {
    console.error("Registration fail:", error.response?.data || error.message);
    throw error;
  }
};

export const syncKeys = async () => {
  // Logic to refresh used pre-keys on server
};
