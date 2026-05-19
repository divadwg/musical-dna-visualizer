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
    <div className="surface-card p-6 flex flex-col gap-5">
      <div className="flex items-baseline justify-between">
        <span className="label-mono">01 / Capture</span>
        <span className="label-mono">max {maxLabel}</span>
      </div>

      <div className="flex flex-col gap-1">
        <h3 className="text-[18px] font-bold tracking-tight">
          {isRecording ? sourceLabel : 'Capture audio'}
        </h3>
        <p className="text-[13px] text-[color:var(--muted-foreground)]">
          {isRecording
            ? 'Recording in progress. Stop anytime to analyze what you have.'
            : 'Pipe a tab’s audio into the analyzer, or use your mic.'}
        </p>
      </div>

      {/* Level meter */}
      <div className="flex items-end gap-[2px] h-12 px-1">
        {Array.from({ length: LEVEL_BARS }).map((_, i) => {
          const ratio = (i + 1) / LEVEL_BARS;
          const active = isRecording && level >= ratio * 0.7;
          const baseHeight = isRecording
            ? Math.max(10, Math.min(100, level * 100 * (0.5 + (i / LEVEL_BARS) * 0.7)))
            : 12;
          return (
            <div
              key={i}
              className={cn(
                'flex-1 rounded-[1px] transition-all duration-75',
                active ? 'bg-[color:var(--accent)]' : 'bg-[color:var(--surface-raised)]'
              )}
              style={{ height: `${baseHeight}%` }}
            />
          );
        })}
      </div>

      {/* Progress bar */}
      <div className="flex items-center gap-3">
        <span className="font-mono text-[11px] text-[color:var(--muted-strong)] tabular-nums w-10">
          {formatElapsed(elapsedMs)}
        </span>
        <div className="flex-1 h-[3px] bg-[color:var(--surface-raised)] rounded-full overflow-hidden">
          <div
            className="h-full bg-[color:var(--accent)] transition-[width] duration-100"
            style={{ width: `${progress * 100}%` }}
          />
        </div>
        <span className="font-mono text-[11px] text-[color:var(--muted-strong)] tabular-nums w-10 text-right">
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
            className="px-4 py-2.5 bg-[color:var(--accent-deep)] text-white rounded-md text-[14px] font-medium hover:bg-[color:var(--accent-deep-hover)] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Share a tab
          </button>
          <button
            type="button"
            onClick={() => start('mic')}
            disabled={disabled}
            className="px-4 py-2.5 bg-white border border-[color:var(--border)] text-[color:var(--foreground)] rounded-md text-[14px] font-medium hover:bg-[color:var(--surface)] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Use microphone
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={stop}
          className="w-full px-4 py-2.5 bg-[color:var(--foreground)] text-white rounded-md text-[14px] font-medium hover:opacity-90 transition-opacity"
        >
          Stop &amp; analyze
        </button>
      )}

      {/* Spotify note */}
      <div className="bg-[color:var(--surface)] border border-[color:var(--border)] rounded-md p-3">
        <div className="label-mono mb-1.5">Heads up</div>
        <p className="text-[13px] text-[color:var(--muted-foreground)] leading-relaxed">
          Spotify is DRM-protected — Chrome mutes the audio in tab captures of its web player.
          Use <span className="text-[color:var(--foreground)] font-medium">YouTube</span> (or any non-DRM source) for tab sharing.
        </p>
      </div>

      {error && (
        <p className="text-[13px] text-[color:var(--destructive)] bg-[color:var(--destructive)]/10 px-3 py-2 rounded-md">
          {error}
        </p>
      )}
    </div>
  );
}
