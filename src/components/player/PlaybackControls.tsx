'use client';

import { usePlaybackStore } from '@/stores/playback-store';
import { Button } from '@/components/ui/button';

export function PlaybackControls() {
  const { isPlaying, play, pause, stop, audioBuffer } = usePlaybackStore();

  if (!audioBuffer) return null;

  return (
    <div className="flex items-center gap-2">
      <Button variant="outline" size="icon" onClick={stop} title="Stop">
        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
          <rect x="6" y="6" width="12" height="12" />
        </svg>
      </Button>

      <Button
        variant="default"
        size="icon"
        onClick={isPlaying ? pause : play}
        title={isPlaying ? 'Pause' : 'Play'}
      >
        {isPlaying ? (
          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
            <rect x="6" y="4" width="4" height="16" />
            <rect x="14" y="4" width="4" height="16" />
          </svg>
        ) : (
          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
            <path d="M8 5v14l11-7z" />
          </svg>
        )}
      </Button>
    </div>
  );
}
