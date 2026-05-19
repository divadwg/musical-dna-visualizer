import { create } from 'zustand';

interface PlaybackState {
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  audioBuffer: AudioBuffer | null;
  audioContext: AudioContext | null;
  sourceNode: AudioBufferSourceNode | null;
  startedAt: number;
  pausedAt: number;

  // Actions
  setAudioBuffer: (buffer: AudioBuffer) => void;
  play: () => void;
  pause: () => void;
  stop: () => void;
  seek: (time: number) => void;
  setCurrentTime: (time: number) => void;
  cleanup: () => void;
}

export const usePlaybackStore = create<PlaybackState>((set, get) => ({
  isPlaying: false,
  currentTime: 0,
  duration: 0,
  audioBuffer: null,
  audioContext: null,
  sourceNode: null,
  startedAt: 0,
  pausedAt: 0,

  setAudioBuffer: (buffer) => {
    const state = get();

    // Create audio context if needed
    let audioContext = state.audioContext;
    if (!audioContext) {
      audioContext = new AudioContext();
    }

    set({
      audioBuffer: buffer,
      audioContext,
      duration: buffer.duration,
      currentTime: 0,
      pausedAt: 0,
    });
  },

  play: () => {
    const state = get();
    if (!state.audioBuffer || !state.audioContext) return;
    if (state.isPlaying) return;

    const source = state.audioContext.createBufferSource();
    source.buffer = state.audioBuffer;
    source.connect(state.audioContext.destination);

    const offset = state.pausedAt;
    source.start(0, offset);

    // Handle when audio ends
    source.onended = () => {
      const currentState = get();
      if (currentState.isPlaying) {
        set({ isPlaying: false, currentTime: 0, pausedAt: 0 });
      }
    };

    set({
      sourceNode: source,
      isPlaying: true,
      startedAt: state.audioContext.currentTime - offset,
    });
  },

  pause: () => {
    const state = get();
    if (!state.isPlaying || !state.sourceNode || !state.audioContext) return;

    state.sourceNode.stop();
    const elapsed = state.audioContext.currentTime - state.startedAt;

    set({
      isPlaying: false,
      pausedAt: elapsed,
      currentTime: elapsed,
      sourceNode: null,
    });
  },

  stop: () => {
    const state = get();
    if (state.sourceNode) {
      try {
        state.sourceNode.stop();
      } catch {
        // Already stopped
      }
    }

    set({
      isPlaying: false,
      currentTime: 0,
      pausedAt: 0,
      sourceNode: null,
    });
  },

  seek: (time) => {
    const state = get();
    const wasPlaying = state.isPlaying;

    // Stop current playback
    if (state.sourceNode) {
      try {
        state.sourceNode.stop();
      } catch {
        // Already stopped
      }
    }

    set({
      pausedAt: time,
      currentTime: time,
      isPlaying: false,
      sourceNode: null,
    });

    // Resume if was playing
    if (wasPlaying) {
      get().play();
    }
  },

  setCurrentTime: (time) => set({ currentTime: time }),

  cleanup: () => {
    const state = get();
    if (state.sourceNode) {
      try {
        state.sourceNode.stop();
      } catch {
        // Already stopped
      }
    }
    if (state.audioContext) {
      state.audioContext.close();
    }
    set({
      isPlaying: false,
      currentTime: 0,
      duration: 0,
      audioBuffer: null,
      audioContext: null,
      sourceNode: null,
      startedAt: 0,
      pausedAt: 0,
    });
  },
}));
