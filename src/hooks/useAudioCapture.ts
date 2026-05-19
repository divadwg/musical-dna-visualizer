'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

export type CaptureSource = 'mic' | 'tab';

interface UseAudioCaptureOptions {
  maxDurationMs?: number;
  onComplete?: (file: File) => void;
}

interface UseAudioCaptureReturn {
  isRecording: boolean;
  source: CaptureSource | null;
  elapsedMs: number;
  level: number;
  error: string | null;
  start: (source: CaptureSource) => Promise<void>;
  stop: () => void;
}

const DEFAULT_MAX_MS = 20_000;

async function acquireStream(source: CaptureSource): Promise<MediaStream> {
  if (source === 'mic') {
    if (!navigator.mediaDevices?.getUserMedia) {
      throw new Error('Microphone capture is not supported in this browser.');
    }
    return navigator.mediaDevices.getUserMedia({
      audio: {
        echoCancellation: false,
        noiseSuppression: false,
        autoGainControl: false,
      },
    });
  }

  // Tab / display capture
  if (!navigator.mediaDevices?.getDisplayMedia) {
    throw new Error('Tab audio sharing is not supported in this browser.');
  }
  const display = await navigator.mediaDevices.getDisplayMedia({
    audio: true,
    video: true, // required by getDisplayMedia; we discard it
  });
  const audioTracks = display.getAudioTracks();
  if (audioTracks.length === 0) {
    display.getTracks().forEach((t) => t.stop());
    throw new Error(
      'No audio was shared. In the picker, choose a tab and check "Share tab audio."'
    );
  }
  // Stop video tracks — we only need audio
  display.getVideoTracks().forEach((t) => t.stop());
  return new MediaStream(audioTracks);
}

function pickMimeType(): string | undefined {
  if (typeof MediaRecorder === 'undefined') return undefined;
  const candidates = [
    'audio/webm;codecs=opus',
    'audio/webm',
    'audio/mp4',
    'audio/ogg;codecs=opus',
  ];
  for (const t of candidates) {
    if (MediaRecorder.isTypeSupported(t)) return t;
  }
  return undefined;
}

export function useAudioCapture(options: UseAudioCaptureOptions = {}): UseAudioCaptureReturn {
  const { maxDurationMs = DEFAULT_MAX_MS, onComplete } = options;

  const [isRecording, setIsRecording] = useState(false);
  const [source, setSource] = useState<CaptureSource | null>(null);
  const [elapsedMs, setElapsedMs] = useState(0);
  const [level, setLevel] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const streamRef = useRef<MediaStream | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const startTimeRef = useRef<number>(0);
  const rafRef = useRef<number | null>(null);
  const autoStopRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const onCompleteRef = useRef(onComplete);

  useEffect(() => {
    onCompleteRef.current = onComplete;
  }, [onComplete]);

  const cleanup = useCallback(() => {
    if (rafRef.current !== null) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
    if (autoStopRef.current) {
      clearTimeout(autoStopRef.current);
      autoStopRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
      audioContextRef.current.close();
    }
    audioContextRef.current = null;
    analyserRef.current = null;
    recorderRef.current = null;
  }, []);

  useEffect(() => cleanup, [cleanup]);

  const start = useCallback(
    async (src: CaptureSource) => {
      setError(null);
      setElapsedMs(0);
      setLevel(0);
      chunksRef.current = [];

      try {
        const stream = await acquireStream(src);
        streamRef.current = stream;
        setSource(src);

        // If the user stops the share from Chrome's UI, end capture gracefully
        stream.getAudioTracks().forEach((track) => {
          track.addEventListener('ended', () => {
            if (recorderRef.current && recorderRef.current.state === 'recording') {
              recorderRef.current.stop();
            }
          });
        });

        // Live level meter
        const ctx = new AudioContext();
        audioContextRef.current = ctx;
        const audioSource = ctx.createMediaStreamSource(stream);
        const analyser = ctx.createAnalyser();
        analyser.fftSize = 1024;
        audioSource.connect(analyser);
        analyserRef.current = analyser;

        const buffer = new Float32Array(analyser.fftSize);
        const tick = () => {
          if (!analyserRef.current) return;
          analyserRef.current.getFloatTimeDomainData(buffer);
          let sum = 0;
          for (let i = 0; i < buffer.length; i++) sum += buffer[i] * buffer[i];
          const rms = Math.sqrt(sum / buffer.length);
          setLevel(Math.min(1, rms * 4));
          setElapsedMs(Date.now() - startTimeRef.current);
          rafRef.current = requestAnimationFrame(tick);
        };

        const mimeType = pickMimeType();
        const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
        recorderRef.current = recorder;

        recorder.ondataavailable = (e) => {
          if (e.data && e.data.size > 0) chunksRef.current.push(e.data);
        };

        recorder.onstop = () => {
          const type = mimeType ?? 'audio/webm';
          const ext = type.includes('mp4') ? 'm4a' : type.includes('ogg') ? 'ogg' : 'webm';
          const blob = new Blob(chunksRef.current, { type });
          const prefix = src === 'tab' ? 'tab-capture' : 'mic-capture';
          const file = new File([blob], `${prefix}-${Date.now()}.${ext}`, { type });
          chunksRef.current = [];
          setIsRecording(false);
          setSource(null);
          cleanup();
          onCompleteRef.current?.(file);
        };

        startTimeRef.current = Date.now();
        recorder.start();
        setIsRecording(true);
        rafRef.current = requestAnimationFrame(tick);

        autoStopRef.current = setTimeout(() => {
          if (recorderRef.current && recorderRef.current.state === 'recording') {
            recorderRef.current.stop();
          }
        }, maxDurationMs);
      } catch (err) {
        console.error('Audio capture failed:', err);
        const message =
          err instanceof Error
            ? err.name === 'NotAllowedError'
              ? src === 'mic'
                ? 'Microphone permission denied.'
                : 'Tab sharing was cancelled or denied.'
              : err.message
            : 'Could not start capture.';
        setError(message);
        cleanup();
        setIsRecording(false);
        setSource(null);
      }
    },
    [maxDurationMs, cleanup]
  );

  const stop = useCallback(() => {
    if (recorderRef.current && recorderRef.current.state === 'recording') {
      recorderRef.current.stop();
    }
  }, []);

  return { isRecording, source, elapsedMs, level, error, start, stop };
}
