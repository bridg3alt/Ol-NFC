// =====================================================
// Olvia - Voice Recording Service
// Handles audio recording and playback for voice prompts
// =====================================================

import { VoicePrompt } from '@/types';

export type RecordingState = 'idle' | 'recording' | 'paused' | 'stopped';

export interface RecordingOptions {
  maxDuration?: number; // in seconds
  sampleRate?: number;
  echoCancellation?: boolean;
  noiseSuppression?: boolean;
}

class VoiceRecordingService {
  private mediaRecorder: MediaRecorder | null = null;
  private audioChunks: Blob[] = [];
  private stream: MediaStream | null = null;
  private duration: number = 0;
  private durationTimer: NodeJS.Timeout | null = null;
  private state: RecordingState = 'idle';

  // Check if getUserMedia is supported
  isSupported(): boolean {
    return !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia);
  }

  // Request microphone permission
  async requestPermission(): Promise<boolean> {
    try {
      this.stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      return true;
    } catch (error) {
      console.error('Microphone permission denied:', error);
      return false;
    }
  }

  // Start recording
  async startRecording(options: RecordingOptions = {}): Promise<boolean> {
    if (this.state === 'recording') {
      return false;
    }

    try {
      this.stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          sampleRate: options.sampleRate || 44100,
          echoCancellation: options.echoCancellation ?? true,
          noiseSuppression: options.noiseSuppression ?? true,
        },
      });

      this.audioChunks = [];
      this.duration = 0;

      this.mediaRecorder = new MediaRecorder(this.stream, {
        mimeType: 'audio/webm;codecs=opus',
      });

      this.mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          this.audioChunks.push(event.data);
        }
      };

      this.mediaRecorder.start(100); // Collect data every 100ms

      // Start duration timer
      this.durationTimer = setInterval(() => {
        this.duration++;
        
        // Auto-stop if max duration reached
        if (options.maxDuration && this.duration >= options.maxDuration) {
          this.stopRecording();
        }
      }, 1000);

      this.state = 'recording';
      return true;
    } catch (error) {
      console.error('Failed to start recording:', error);
      return false;
    }
  }

  // Pause recording
  pauseRecording(): void {
    if (this.mediaRecorder && this.state === 'recording') {
      this.mediaRecorder.pause();
      this.state = 'paused';
      
      if (this.durationTimer) {
        clearInterval(this.durationTimer);
        this.durationTimer = null;
      }
    }
  }

  // Resume recording
  resumeRecording(): void {
    if (this.mediaRecorder && this.state === 'paused') {
      this.mediaRecorder.resume();
      this.state = 'recording';
      
      this.durationTimer = setInterval(() => {
        this.duration++;
      }, 1000);
    }
  }

  // Stop recording
  async stopRecording(): Promise<Blob | null> {
    if (!this.mediaRecorder || this.state === 'idle') {
      return null;
    }

    return new Promise((resolve) => {
      if (!this.mediaRecorder) {
        resolve(null);
        return;
      }

      this.mediaRecorder.onstop = () => {
        const audioBlob = new Blob(this.audioChunks, { type: 'audio/webm' });
        this.state = 'stopped';
        
        // Clean up
        if (this.durationTimer) {
          clearInterval(this.durationTimer);
          this.durationTimer = null;
        }
        
        if (this.stream) {
          this.stream.getTracks().forEach(track => track.stop());
          this.stream = null;
        }

        resolve(audioBlob);
      };

      this.mediaRecorder.stop();
    });
  }

  // Cancel recording
  cancelRecording(): void {
    if (this.mediaRecorder) {
      this.mediaRecorder.stop();
    }
    
    if (this.durationTimer) {
      clearInterval(this.durationTimer);
      this.durationTimer = null;
    }
    
    if (this.stream) {
      this.stream.getTracks().forEach(track => track.stop());
      this.stream = null;
    }
    
    this.audioChunks = [];
    this.duration = 0;
    this.state = 'idle';
  }

  // Get current duration
  getDuration(): number {
    return this.duration;
  }

  // Get current state
  getState(): RecordingState {
    return this.state;
  }

  // Convert audio blob to base64
  async blobToBase64(blob: Blob): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64 = reader.result as string;
        resolve(base64.split(',')[1]); // Remove data URL prefix
      };
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  }

  // Convert base64 to audio blob
  base64ToBlob(base64: string, mimeType: string = 'audio/webm'): Blob {
    const byteCharacters = atob(base64);
    const byteNumbers = new Array(byteCharacters.length);
    
    for (let i = 0; i < byteCharacters.length; i++) {
      byteNumbers[i] = byteCharacters.charCodeAt(i);
    }
    
    const byteArray = new Uint8Array(byteNumbers);
    return new Blob([byteArray], { type: mimeType });
  }

  // Play audio from blob
  async playAudio(audioBlob: Blob): Promise<void> {
    const url = URL.createObjectURL(audioBlob);
    const audio = new Audio(url);
    
    return new Promise((resolve, reject) => {
      audio.onended = () => {
        URL.revokeObjectURL(url);
        resolve();
      };
      audio.onerror = () => {
        URL.revokeObjectURL(url);
        reject(new Error('Failed to play audio'));
      };
      audio.play();
    });
  }

  // Play audio from URL
  async playAudioFromUrl(url: string): Promise<void> {
    const audio = new Audio(url);
    
    return new Promise((resolve, reject) => {
      audio.onended = () => resolve();
      audio.onerror = () => reject(new Error('Failed to play audio'));
      audio.play();
    });
  }

  // Stop currently playing audio
  stopAudio(): void {
    const audio = document.querySelector('audio');
    if (audio) {
      audio.pause();
      audio.currentTime = 0;
    }
  }

  // Get audio duration from blob
  async getAudioDuration(audioBlob: Blob): Promise<number> {
    return new Promise((resolve) => {
      const audio = new Audio();
      audio.src = URL.createObjectURL(audioBlob);
      
      audio.onloadedmetadata = () => {
        URL.revokeObjectURL(audio.src);
        resolve(audio.duration);
      };
      
      audio.onerror = () => {
        URL.revokeObjectURL(audio.src);
        resolve(0);
      };
    });
  }

  // Create audio element for playback with controls
  createAudioPlayer(audioBlob: Blob): HTMLAudioElement {
    const url = URL.createObjectURL(audioBlob);
    const audio = new Audio(url);
    audio.controls = true;
    return audio;
  }

  // Upload audio to storage (simulated)
  async uploadAudio(audioBlob: Blob, fileName: string): Promise<string> {
    // In a real implementation, this would upload to Firebase Storage or similar
    // For now, we'll simulate with a mock URL
    const mockUrl = `https://storage.example.com/voice-prompts/${fileName}`;
    
    // Simulate upload delay
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    return mockUrl;
  }

  // Delete audio from storage
  async deleteAudio(url: string): Promise<boolean> {
    // In a real implementation, this would delete from Firebase Storage
    // Simulate deletion
    await new Promise(resolve => setTimeout(resolve, 500));
    return true;
  }
}

// Singleton instance
export const voiceRecordingService = new VoiceRecordingService();

// React Hook for voice recording
export function useVoiceRecording() {
  return voiceRecordingService;
}

export default VoiceRecordingService;
