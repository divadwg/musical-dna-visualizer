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
    md: '',
    lg: 'text-[12px] px-3 py-1.5',
  };
  const cls = sizeClasses[size];

  const energyLabel =
    features.danceability !== undefined
      ? features.danceability > 0.7
        ? 'High energy'
        : features.danceability > 0.4
          ? 'Medium'
          : 'Chill'
      : null;

  return (
    <div className="flex flex-wrap gap-1.5">
      <span className={`status done ${cls}`}>
        {features.key.key} {features.key.scale}
      </span>
      <span className={`status plain mono ${cls}`}>{Math.round(features.tempo.bpm)} BPM</span>
      <span className={`status plain mono ${cls}`}>{formatDuration(metadata.duration)}</span>
      {energyLabel && <span className={`status plain ${cls}`}>{energyLabel}</span>}
    </div>
  );
}
