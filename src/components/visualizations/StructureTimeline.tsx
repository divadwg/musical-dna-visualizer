'use client';

import { useEffect, useRef } from 'react';
import { usePlaybackStore } from '@/stores/playback-store';
import type { SongSegment } from '@/types/audio-features';

interface StructureTimelineProps {
  segments: SongSegment[];
  duration: number;
  beats: number[];
}

const SEGMENT_COLORS: Record<string, { bg: string; border: string; text: string }> = {
  intro: { bg: '#4A90D9', border: '#3A70B9', text: '#ffffff' },
  verse: { bg: '#50C878', border: '#40A868', text: '#ffffff' },
  chorus: { bg: '#FF7F50', border: '#EF6F40', text: '#ffffff' },
  bridge: { bg: '#9B59B6', border: '#8B49A6', text: '#ffffff' },
  breakdown: { bg: '#34495E', border: '#24394E', text: '#ffffff' },
  outro: { bg: '#718093', border: '#617083', text: '#ffffff' },
  instrumental: { bg: '#F39C12', border: '#E38C02', text: '#ffffff' },
  unknown: { bg: '#95A5A6', border: '#859596', text: '#ffffff' },
};

export function StructureTimeline({ segments, duration, beats }: StructureTimelineProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const { currentTime, seek } = usePlaybackStore();

  const handleClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const seekTime = (x / rect.width) * duration;
    seek(seekTime);
  };

  return (
    <div className="space-y-4">
      {/* Main timeline */}
      <div
        ref={containerRef}
        className="relative h-24 bg-muted/30 rounded-lg overflow-hidden cursor-pointer"
        onClick={handleClick}
      >
        {/* Segment blocks */}
        {segments.map((segment, idx) => {
          const left = (segment.start / duration) * 100;
          const width = ((segment.end - segment.start) / duration) * 100;
          const colors = SEGMENT_COLORS[segment.label] || SEGMENT_COLORS.unknown;

          return (
            <div
              key={idx}
              className="absolute top-0 h-full flex flex-col items-center justify-center transition-all hover:brightness-110"
              style={{
                left: `${left}%`,
                width: `${width}%`,
                backgroundColor: colors.bg,
                borderLeft: `2px solid ${colors.border}`,
              }}
            >
              <span
                className="text-xs font-medium uppercase tracking-wide"
                style={{ color: colors.text }}
              >
                {segment.label}
              </span>
              <span className="text-xs opacity-70" style={{ color: colors.text }}>
                {formatTime(segment.end - segment.start)}
              </span>
            </div>
          );
        })}

        {/* Beat markers */}
        <div className="absolute inset-0 pointer-events-none">
          {beats.slice(0, 200).map((beat, idx) => (
            <div
              key={idx}
              className="absolute top-0 h-full w-px bg-white/20"
              style={{ left: `${(beat / duration) * 100}%` }}
            />
          ))}
        </div>

        {/* Playhead */}
        <div
          className="absolute top-0 h-full w-0.5 bg-white shadow-lg z-10"
          style={{
            left: `${(currentTime / duration) * 100}%`,
            boxShadow: '0 0 10px rgba(255,255,255,0.5)',
          }}
        />
      </div>

      {/* Time axis */}
      <div className="relative h-6">
        {[0, 0.25, 0.5, 0.75, 1].map((fraction) => (
          <div
            key={fraction}
            className="absolute text-xs text-muted-foreground"
            style={{ left: `${fraction * 100}%`, transform: 'translateX(-50%)' }}
          >
            {formatTime(duration * fraction)}
          </div>
        ))}
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-2">
        {Object.entries(SEGMENT_COLORS).map(([label, colors]) => (
          <div key={label} className="flex items-center gap-1.5 text-xs">
            <div
              className="w-3 h-3 rounded"
              style={{ backgroundColor: colors.bg }}
            />
            <span className="capitalize text-muted-foreground">{label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}
