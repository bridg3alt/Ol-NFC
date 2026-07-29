'use client';

import { useState, useRef, useEffect } from 'react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import {
  Mic,
  Play,
  Pause,
  StopCircle,
  Trash2,
  Volume2,
  Clock,
} from 'lucide-react';
import { VoicePrompt } from '@/types';
import { voiceRecordingService } from '@/services/voiceRecording';
import { useApp } from '@/context/AppContext';
import { useAuth } from '@/context/AuthContext';
import { encodeVoicePrompt, MAX_RECORDING_SECONDS } from '@/services/storage';

export default function VoicePromptsPage() {
  const { user } = useAuth();
  const { voicePrompts, addVoicePrompt, deleteVoicePrompt } = useApp();
  const [isRecording, setIsRecording] = useState(false);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const [playingId, setPlayingId] = useState<string | null>(null);
  const [showNewPromptForm, setShowNewPromptForm] = useState(false);
  const [newPromptName, setNewPromptName] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const timerRef = useRef<NodeJS.Timeout | null>(null);
  // Lets the interval stop the recording without depending on declaration order.
  const stopRecordingRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, []);

  const startRecording = async () => {
    const hasPermission = await voiceRecordingService.requestPermission();
    if (!hasPermission) {
      alert('Microphone permission is required to record voice prompts');
      return;
    }

    const started = await voiceRecordingService.startRecording({
      maxDuration: MAX_RECORDING_SECONDS,
    });
    if (started) {
      setIsRecording(true);
      setRecordingDuration(0);
      
      timerRef.current = setInterval(() => {
        setRecordingDuration(d => {
          // Stop at the cap so the clip always fits in its Firestore document.
          if (d + 1 >= MAX_RECORDING_SECONDS) {
            stopRecordingRef.current?.();
          }
          return d + 1;
        });
      }, 1000);
    }
  };

  const stopRecording = async () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }

    const audioBlob = await voiceRecordingService.stopRecording();
    setIsRecording(false);

    if (!audioBlob || !user) return;

    setIsSaving(true);
    setError(null);
    try {
      const audioUrl = await encodeVoicePrompt(audioBlob);
      await addVoicePrompt({
        name: newPromptName.trim() || `Recording ${voicePrompts.length + 1}`,
        audioUrl,
        duration: recordingDuration,
      });
      setNewPromptName('');
      setShowNewPromptForm(false);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setIsSaving(false);
    }
  };

  stopRecordingRef.current = stopRecording;

  const cancelRecording = () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    
    voiceRecordingService.cancelRecording();
    setIsRecording(false);
    setRecordingDuration(0);
  };

  const handlePlay = async (prompt: VoicePrompt) => {
    if (playingId) {
      voiceRecordingService.stopAudio();
      setPlayingId(null);
      
      if (playingId !== prompt.id) {
        setPlayingId(prompt.id);
        await voiceRecordingService.playAudioFromUrl(prompt.audioUrl);
        setPlayingId(null);
      }
    } else {
      setPlayingId(prompt.id);
      await voiceRecordingService.playAudioFromUrl(prompt.audioUrl);
      setPlayingId(null);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this voice prompt?')) return;
    try {
      await deleteVoicePrompt(id);
    } catch (e) {
      setError((e as Error).message);
    }
  };

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <header>
          <h1 className="text-2xl font-display font-semibold text-gray-900">Voice Prompts</h1>
          <p className="text-gray-500 mt-1">Record personalized voice reminders for medication times</p>
        </header>

        <div className="card p-5 bg-secondary-50 border-secondary-200">
          <div className="flex items-start gap-3">
            <Volume2 className="w-5 h-5 text-secondary-600 mt-0.5" />
            <div>
              <h3 className="font-medium text-secondary-900">Familiar Voices Matter</h3>
              <p className="text-sm text-secondary-700 mt-1">
                Recording voice prompts from caregivers or family members can significantly increase 
                medication compliance, especially for elderly and neurodivergent users.
              </p>
            </div>
          </div>
        </div>

        {error && (
          <div className="card p-4 bg-error-50 border-error-200 text-sm text-error-700">
            {error}
          </div>
        )}

        <div className="card p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Record New Voice Prompt</h2>

          {!showNewPromptForm ? (
            <button
              onClick={() => setShowNewPromptForm(true)}
              className="btn btn-primary"
            >
              <Mic className="w-5 h-5 mr-2" />
              Start Recording
            </button>
          ) : (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Prompt Name
                </label>
                <input
                  type="text"
                  value={newPromptName}
                  onChange={(e) => setNewPromptName(e.target.value)}
                  placeholder="e.g., Morning Reminder"
                  className="input"
                />
              </div>

              <div className="flex items-center gap-4">
                {isRecording ? (
                  <>
                    <div className="flex items-center gap-2">
                      <span className="w-3 h-3 bg-error-500 rounded-full animate-pulse" />
                      <span className="font-mono text-lg">{formatDuration(recordingDuration)}</span>
                      <span className="text-sm text-gray-500">
                        / {formatDuration(MAX_RECORDING_SECONDS)} max
                      </span>
                    </div>
                    <button onClick={stopRecording} className="btn btn-success">
                      <StopCircle className="w-5 h-5 mr-2" />
                      Stop
                    </button>
                    <button onClick={cancelRecording} className="btn btn-ghost">
                      Cancel
                    </button>
                  </>
                ) : (
                  <button
                    onClick={startRecording}
                    disabled={isSaving}
                    className="btn btn-primary"
                  >
                    <Mic className="w-5 h-5 mr-2" />
                    {isSaving ? 'Saving…' : 'Start Recording'}
                  </button>
                )}
              </div>
            </div>
          )}
        </div>

        <div className="card p-5">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Your Voice Prompts</h2>
          
          {voicePrompts.length === 0 ? (
            <div className="text-center py-8">
              <Mic className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500">No voice prompts yet</p>
            </div>
          ) : (
            <div className="space-y-3">
              {voicePrompts.map(prompt => (
                <div
                  key={prompt.id}
                  className="flex items-center gap-4 p-4 bg-gray-50 rounded-xl"
                >
                  <button
                    onClick={() => handlePlay(prompt)}
                    className="w-12 h-12 rounded-full bg-primary-100 flex items-center justify-center text-primary-600 hover:bg-primary-200 transition-colors"
                  >
                    {playingId === prompt.id ? (
                      <Pause className="w-5 h-5" />
                    ) : (
                      <Play className="w-5 h-5 ml-0.5" />
                    )}
                  </button>
                  
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <h3 className="font-medium text-gray-900">{prompt.name}</h3>
                      {prompt.isDefault && (
                        <span className="badge badge-primary text-xs">Default</span>
                      )}
                    </div>
                    <div className="flex items-center gap-3 mt-1">
                      <span className="text-sm text-gray-500 flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {formatDuration(prompt.duration)}
                      </span>
                    </div>
                  </div>

                  <button
                    onClick={() => handleDelete(prompt.id)}
                    className="p-2 rounded-lg hover:bg-gray-200 text-gray-500 hover:text-error-600 transition-colors"
                  >
                    <Trash2 className="w-5 h-5" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
