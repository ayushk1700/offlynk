import { NetInfoState } from '@react-native-community/netinfo';

export enum NetworkMode {
    Online = 'online',
    Mesh = 'mesh',
    Offline = 'offline'
}

/**
 * Phase 2: Auto-Download Control Logic
 * Evaluates whether a media item should be downloaded based on current network state.
 */
export const shouldAutoDownload = (
    fileSize: number, 
    type: 'image' | 'video' | 'doc', 
    mode: NetworkMode,
    userSettings: any
) => {
    // Default Rules:
    // 1. Never auto-download large files (>10MB) over Mesh.
    // 2. Images auto-download on WiFi and Online.
    // 3. Document auto-download always off by default.
    
    if (mode === NetworkMode.Mesh) {
        return type === 'image' && fileSize < 1024 * 500; // Only small thumbnails over Mesh
    }

    if (mode === NetworkMode.Online) {
        if (type === 'image') return userSettings.autoDownloadImages;
        if (type === 'video') return userSettings.wifiOnly ? false : userSettings.autoDownloadVideos;
    }

    return false;
};
