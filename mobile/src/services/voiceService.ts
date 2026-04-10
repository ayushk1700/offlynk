import { Audio } from 'expo-av';

export class VoiceService {
  private recording: Audio.Recording | null = null;

  async startRecording() {
    try {
      await Audio.requestPermissionsAsync();
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
      });

      const { recording } = await Audio.Recording.createAsync(
        Audio.RecordingOptionsPresets.HIGH_QUALITY
      );
      this.recording = recording;
      console.log('Recording started');
    } catch (err) {
      console.error('Failed to start recording', err);
    }
  }

  async stopRecording() {
    if (!this.recording) return null;
    
    await this.recording.stopAndUnloadAsync();
    const uri = this.recording.getURI();
    this.recording = null;
    return uri;
  }
}

export const voiceService = new VoiceService();
