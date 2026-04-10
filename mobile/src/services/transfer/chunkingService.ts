import * as FileSystem from 'expo-file-system';
import * as Crypto from 'expo-crypto';

const CHUNK_SIZE = 1 * 1024 * 1024; // 1 MB

export const prepareFileForMesh = async (fileUri: string, messageId: string) => {
  const fileInfo = await FileSystem.getInfoAsync(fileUri);
  if (!fileInfo.exists) throw new Error('File not found');

  const totalSize = (fileInfo as any).size as number;
  const chunkCount = Math.ceil(totalSize / CHUNK_SIZE);
  const outputDir = `${FileSystem.documentDirectory}transfers/${messageId}/`;
  await FileSystem.makeDirectoryAsync(outputDir, { intermediates: true });

  // Per-chunk integrity manifest
  const manifest: { index: number; hash: string }[] = [];

  for (let i = 0; i < chunkCount; i++) {
    const chunkBlob = await FileSystem.readAsStringAsync(fileUri, {
      encoding: FileSystem.EncodingType.Base64,
      length: CHUNK_SIZE,
      position: i * CHUNK_SIZE,
    });

    // TODO: encrypt chunkBlob with Signal message key before storing
    const chunkPath = `${outputDir}chunk_${i}.bin`;
    await FileSystem.writeAsStringAsync(chunkPath, chunkBlob);

    // SHA-256 per chunk so receiver can detect corruption
    const hash = await Crypto.digestStringAsync(
      Crypto.CryptoDigestAlgorithm.SHA256,
      chunkBlob
    );
    manifest.push({ index: i, hash });
  }

  await FileSystem.writeAsStringAsync(
    `${outputDir}manifest.json`,
    JSON.stringify({ chunkCount, manifest })
  );

  console.log(`[RCP] ${chunkCount} chunks prepared for ${messageId}`);
  return { chunkCount, outputDir, manifest };
};

/**
 * Reassembles chunks on the receiver side.
 * FIX: Was an empty stub that returned a path without reading any data,
 * producing zero-byte output files.
 */
export const reassembleFile = async (
  messageId: string,
  chunkCount: number
): Promise<string> => {
  const inputDir = `${FileSystem.documentDirectory}transfers/${messageId}/`;
  const finalPath = `${FileSystem.documentDirectory}decrypted_${messageId}.tmp`;

  // Verify manifest exists
  const manifestPath = `${inputDir}manifest.json`;
  const manifestInfo = await FileSystem.getInfoAsync(manifestPath);
  if (!manifestInfo.exists) throw new Error(`[RCP] Manifest missing for ${messageId}`);

  const manifestRaw = await FileSystem.readAsStringAsync(manifestPath);
  const { manifest } = JSON.parse(manifestRaw) as {
    chunkCount: number;
    manifest: { index: number; hash: string }[];
  };

  // Verify and concatenate all chunks in order
  let reassembled = '';

  for (let i = 0; i < chunkCount; i++) {
    const chunkPath = `${inputDir}chunk_${i}.bin`;
    const chunkInfo = await FileSystem.getInfoAsync(chunkPath);
    if (!chunkInfo.exists) throw new Error(`[RCP] Missing chunk ${i} for ${messageId}`);

    const chunkBlob = await FileSystem.readAsStringAsync(chunkPath);

    // Integrity check: verify SHA-256 hash matches the manifest
    const hash = await Crypto.digestStringAsync(
      Crypto.CryptoDigestAlgorithm.SHA256,
      chunkBlob
    );
    const expected = manifest.find((m) => m.index === i)?.hash;
    if (hash !== expected) {
      throw new Error(`[RCP] Chunk ${i} integrity check failed for ${messageId}`);
    }

    reassembled += chunkBlob;
  }

  // Write the full reassembled Base64 blob to final path
  await FileSystem.writeAsStringAsync(finalPath, reassembled, {
    encoding: FileSystem.EncodingType.Base64,
  });

  console.log(`[RCP] Reassembly complete: ${finalPath}`);
  return finalPath;
};
