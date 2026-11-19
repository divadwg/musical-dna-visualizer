'use client';

import { useEffect } from 'react';
import { useAudioCapture } from '@/hooks/useAudioCapture';
import { cn } from '@/lib/utils';

interface MicCaptureProps {
  onFileSelect: (file: File) => void;
  disabled?: boolean;
  maxDurationMs?: number;
}

const MAX_MS = 180_000; // 3 minutes
const LEVEL_BARS = 28;

function formatElapsed(ms: number) {
  const totalSec = Math.floor(ms / 1000);
  const m = Math.floor(totalSec / 60);
  const s = totalSec % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

export function MicCapture({ onFileSelect, disabled, maxDurationMs = MAX_MS }: MicCaptureProps) {
  const { isRecording, source, elapsedMs, level, error, start, stop } = useAudioCapture({
    maxDurationMs,
    onComplete: onFileSelect,
  });

  useEffect(() => () => {
    if (isRecording) stop();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const progress = Math.min(1, elapsedMs / maxDurationMs);
  const maxLabel = formatElapsed(maxDurationMs);
  const sourceLabel = source === 'tab' ? 'Capturing tab audio' : 'Capturing mic input';

  return (
    <div className="card flex flex-col gap-5">
      <div className="flex items-center justify-between min-h-[22px]">
        <span className="label">01 / Capture</span>
        {isRecording ? (
          <span className="status ok">Recording</span>
        ) : (
          <span className="label">max {maxLabel}</span>
        )}
      </div>

      <div className="flex flex-col gap-1">
        <h2>{isRecording ? sourceLabel : 'Capture audio'}</h2>
        <p className="text-[13px] text-muted-foreground">
          {isRecording
            ? 'Recording in progress. Stop anytime to analyze what you have.'
            : 'Pipe a tab’s audio into the analyzer, or use your mic.'}
        </p>
      </div>

      {/* Level meter: a tick strip */}
      <div className="flex items-end justify-between h-12 px-1">
        {Array.from({ length: LEVEL_BARS }).map((_, i) => {
          const ratio = (i + 1) / LEVEL_BARS;
          const active = isRecording && level >= ratio * 0.7;
          const baseHeight = isRecording
            ? Math.max(10, Math.min(100, level * 100 * (0.5 + (i / LEVEL_BARS) * 0.7)))
            : 28;
          return (
            <div
              key={i}
              className={cn(
                'w-[3px] rounded-[1px] transition-all duration-75',
                active ? 'bg-ink' : 'bg-faint/50'
              )}
              style={{ height: `${baseHeight}%` }}
            />
          );
        })}
      </div>

      {/* Progress bar */}
      <div className="flex items-center gap-3">
        <span className="mono text-[11px] text-muted-foreground tabular-nums w-10">
          {formatElapsed(elapsedMs)}
        </span>
        <div className="track flex-1">
          <div className="transition-[width] duration-100" style={{ width: `${progress * 100}%` }} />
        </div>
        <span className="mono text-[11px] text-muted-foreground tabular-nums w-10 text-right">
          {maxLabel}
        </span>
      </div>

      {/* Controls */}
      {!isRecording ? (
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => start('tab')}
            disabled={disabled}
            className="btn-primary key"
          >
            Share a tab
          </button>
          <button
            type="button"
            onClick={() => start('mic')}
            disabled={disabled}
            className="btn"
          >
            Use microphone
          </button>
        </div>
      ) : (
        <button type="button" onClick={stop} className="btn-primary key w-full">
          Stop &amp; analyze
        </button>
      )}

      {/* Spotify note */}
      <div className="callout">
        <div className="tile key">
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={1.5}
            strokeLinecap="round"
            aria-hidden
          >
            <path d="M12 11v6M12 7.5v.01" />
            <circle cx="12" cy="12" r="9" />
          </svg>
        </div>
        <p className="text-[13px] leading-relaxed">
          Spotify is DRM-protected, so Chrome mutes the audio in tab captures of its web player.
          Use <span className="text-ink font-medium">YouTube</span> (or any non-DRM source) for tab sharing.
        </p>
      </div>

      {error && <p className="error-line">{error}</p>}
    </div>
  );
}
