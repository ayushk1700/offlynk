import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import { Compressor } from 'react-native-compressor';
import * as FileSystem from 'expo-file-system';
import * as MediaLibrary from 'expo-media-library';

/**
 * Pick images from camera or library.
 * FIX: Replaced deprecated `MediaTypeOptions` with `mediaTypes: ['images']`
 * (required for Expo SDK 52+, the old enum was removed in SDK 53).
 */
export const pickImage = async (useCamera: boolean = false, allowMulti: boolean = false) => {
  const permission = useCamera
    ? await ImagePicker.requestCameraPermissionsAsync()
    : await ImagePicker.requestMediaLibraryPermissionsAsync();

  if (!permission.granted) return null;

  const result = useCamera
    ? await ImagePicker.launchCameraAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        quality: 0.8,
      })
    : await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsMultipleSelection: allowMulti,
        selectionLimit: 10,
        quality: 0.8,
      });

  return result.canceled ? null : result.assets;
};

export const compressMedia = async (uri: string, type: 'image' | 'video') => {
  return await Compressor.compress(uri, { compressionMethod: 'auto' });
};

export const pickDocument = async () => {
  const result = await DocumentPicker.getDocumentAsync({
    type: ['application/pdf', 'text/plain', 'application/msword'],
    copyToCacheDirectory: true,
  });
  return result.canceled ? null : result.assets[0];
};

/**
 * Decrypts a file from the transfers directory and saves it to the device gallery.
 * FIX: was an empty stub — now implements the actual MediaLibrary save flow.
 */
export const saveToGallery = async (decryptedUri: string): Promise<string> => {
  const { status } = await MediaLibrary.requestPermissionsAsync();
  if (status !== 'granted') throw new Error('Media library permission required');

  const asset = await MediaLibrary.createAssetAsync(decryptedUri);

  // Try to add to an OffLynk album for easy discovery
  try {
    let album = await MediaLibrary.getAlbumAsync('OffLynk');
    if (!album) {
      album = await MediaLibrary.createAlbumAsync('OffLynk', asset, false);
    } else {
      await MediaLibrary.addAssetsToAlbumAsync([asset], album, false);
    }
  } catch {
    // Album operations can fail on some Android versions — asset is still saved
    console.warn('[Media] Could not add to OffLynk album');
  }

  // Clean up the temp decrypted file after saving
  await FileSystem.deleteAsync(decryptedUri, { idempotent: true });

  return asset.uri;
};
