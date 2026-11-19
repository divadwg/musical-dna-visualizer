'use client';

import { useMemo } from 'react';
import { usePlaybackStore } from '@/stores/playback-store';
import type { SongSegment } from '@/types/audio-features';
import { formatTime } from '@/lib/theme';

interface EnergyArcProps {
  energyEnvelope: number[];
  segments: SongSegment[];
  duration: number;
}

// Dot matrix geometry, in viewBox units
const W = 800;
const H = 204;
const PAD_X = 20;
const COLS = 64;
const ROWS = 10;
const ROW_PITCH = 16;
const GRID_BOTTOM = 176; // centre of the lowest row
const COL_PITCH = (W - PAD_X * 2) / COLS;
const FOOT = 196;

export function EnergyArc({ energyEnvelope, segments, duration }: EnergyArcProps) {
  const { currentTime, seek } = usePlaybackStore();

  // Energy per column: values stack as ink dots on a faint grid
  const dots = useMemo(() => {
    if (energyEnvelope.length === 0) return null;

    const out: React.ReactNode[] = [];
    for (let c = 0; c < COLS; c++) {
      const from = Math.floor((c / COLS) * energyEnvelope.length);
      const to = Math.max(from + 1, Math.floor(((c + 1) / COLS) * energyEnvelope.length));
      let sum = 0;
      for (let i = from; i < to; i++) sum += energyEnvelope[i] || 0;
      const level = Math.round(Math.max(0, Math.min(1, sum / (to - from))) * ROWS);

      const cx = PAD_X + (c + 0.5) * COL_PITCH;
      for (let r = 0; r < ROWS; r++) {
        const filled = r < level;
        out.push(
          <circle
            key={`${c}-${r}`}
            cx={cx}
            cy={GRID_BOTTOM - r * ROW_PITCH}
            r={filled ? 3.5 : 1}
            fill={filled ? 'var(--ink)' : 'var(--faint)'}
          />
        );
      }
    }
    return out;
  }, [energyEnvelope]);

  const currentSegment = segments.find(
    (s) => currentTime >= s.start && currentTime < s.end
  );

  const handleClick = (e: React.MouseEvent<SVGSVGElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * W;
    const fraction = Math.max(0, Math.min(1, (x - PAD_X) / (W - PAD_X * 2)));
    seek(duration * fraction);
  };

  if (energyEnvelope.length === 0) {
    return (
      <div className="h-64 well flex items-center justify-center">
        <p className="label">No energy data available</p>
      </div>
    );
  }

  const nowX =
    PAD_X + (duration > 0 ? Math.max(0, Math.min(1, currentTime / duration)) : 0) * (W - PAD_X * 2);

  return (
    <div className="space-y-3">
      {/* Current segment indicator */}
      <div className="flex items-center gap-3 min-h-[24px]">
        <span className="tip key">{formatTime(currentTime)}</span>
        {currentSegment && (
          <>
            <span className="status ok capitalize">{currentSegment.label}</span>
            <span className="label">Energy {Math.round(currentSegment.avgEnergy * 100)}%</span>
          </>
        )}
      </div>

      {/* Energy dot matrix */}
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="w-full h-auto cursor-pointer"
        onClick={handleClick}
        role="img"
        aria-label="Energy over time"
      >
        {/* Segment boundaries and labels */}
        {segments.map((segment, idx) => {
          const x = PAD_X + (segment.start / duration) * (W - PAD_X * 2);
          const segWidth = ((segment.end - segment.start) / duration) * (W - PAD_X * 2);
          return (
            <g key={idx}>
              {segment.start > 0 && (
                <line x1={x} y1="0" x2={x} y2={GRID_BOTTOM + 8} stroke="var(--line)" strokeWidth="1" />
              )}
              {segWidth > segment.label.length * 7 + 10 && (
                <text
                  x={x + 5}
                  y="9"
                  fill="var(--muted)"
                  style={{
                    font: '500 9px var(--f-mono)',
                    letterSpacing: '0.14em',
                    textTransform: 'uppercase',
                  }}
                >
                  {segment.label}
                </text>
              )}
            </g>
          );
        })}

        {dots}

        {/* "Now" line with a lime dot at its foot */}
        <line x1={nowX} y1="14" x2={nowX} y2={FOOT} stroke="var(--ink)" strokeWidth="1" />
        <circle cx={nowX} cy={FOOT} r="3.5" fill="var(--lime)" stroke="var(--lime-deep)" strokeWidth="1" />
      </svg>

      {/* Time axis */}
      <div className="relative h-4" style={{ margin: `0 ${(PAD_X / W) * 100}%` }}>
        {[0, 0.25, 0.5, 0.75, 1].map((fraction) => (
          <div
            key={fraction}
            className="label absolute !text-[9px]"
            style={{ left: `${fraction * 100}%`, transform: 'translateX(-50%)' }}
          >
            {formatTime(duration * fraction)}
          </div>
        ))}
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-4 pt-1">
        <span className="label flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-ink" />
          Energy, low to high
        </span>
        <span className="label flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-lime shadow-[0_0_0_1px_var(--lime-deep)_inset]" />
          Now
        </span>
      </div>
    </div>
  );
}
