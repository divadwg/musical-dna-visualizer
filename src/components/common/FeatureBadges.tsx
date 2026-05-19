'use client';

import type { SongDNA } from '@/types/audio-features';

interface FeatureBadgesProps {
  song: SongDNA;
  size?: 'sm' | 'md' | 'lg';
}

function formatDuration(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

export function FeatureBadges({ song, size = 'md' }: FeatureBadgesProps) {
  const { features, metadata } = song;

  const sizeClasses = {
    sm: 'text-[10px] px-2 py-[3px]',
    md: 'text-[11px] px-2.5 py-1',
    lg: 'text-[12px] px-3 py-1.5',
  };

  const base =
    'inline-flex items-center gap-1.5 rounded-[3px] font-mono uppercase tracking-[0.08em] border';

  const energyLabel =
    features.danceability !== undefined
      ? features.danceability > 0.7
        ? 'High energy'
        : features.danceability > 0.4
          ? 'Medium'
          : 'Chill'
      : null;

  const energyTone =
    features.danceability !== undefined && features.danceability > 0.7
      ? 'bg-[color:var(--accent-light)] border-[color:var(--accent-light)] text-[color:var(--accent-deep)]'
      : 'bg-[color:var(--surface)] border-[color:var(--border)] text-[color:var(--muted-foreground)]';

  return (
    <div className="flex flex-wrap gap-1.5">
      <span
        className={`${base} ${sizeClasses[size]} bg-white border-[color:var(--border)] text-[color:var(--foreground)]`}
      >
        <span className="w-1.5 h-1.5 rounded-full bg-[color:var(--accent)]" />
        {features.key.key} {features.key.scale}
      </span>

      <span
        className={`${base} ${sizeClasses[size]} bg-white border-[color:var(--border)] text-[color:var(--foreground)]`}
      >
        {Math.round(features.tempo.bpm)} BPM
      </span>

      <span
        className={`${base} ${sizeClasses[size]} bg-[color:var(--surface)] border-[color:var(--border)] text-[color:var(--muted-foreground)]`}
      >
        {formatDuration(metadata.duration)}
      </span>

      {energyLabel && (
        <span className={`${base} ${sizeClasses[size]} ${energyTone}`}>{energyLabel}</span>
      )}
    </div>
  );
}
