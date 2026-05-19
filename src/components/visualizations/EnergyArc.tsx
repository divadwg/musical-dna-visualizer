'use client';

import { useMemo } from 'react';
import { usePlaybackStore } from '@/stores/playback-store';
import type { SongSegment } from '@/types/audio-features';

interface EnergyArcProps {
  energyEnvelope: number[];
  segments: SongSegment[];
  duration: number;
}

const SEGMENT_COLORS: Record<string, string> = {
  intro: '#4A90D9',
  verse: '#50C878',
  chorus: '#FF7F50',
  bridge: '#9B59B6',
  breakdown: '#34495E',
  outro: '#718093',
  instrumental: '#F39C12',
  unknown: '#95A5A6',
};

export function EnergyArc({ energyEnvelope, segments, duration }: EnergyArcProps) {
  const { currentTime, seek } = usePlaybackStore();

  // Generate SVG path for smooth curve
  const { path, gradientStops, width, height } = useMemo(() => {
    const w = 800;
    const h = 200;
    const padding = 20;
    const graphWidth = w - padding * 2;
    const graphHeight = h - padding * 2;

    if (energyEnvelope.length === 0) {
      return { path: '', gradientStops: [], width: w, height: h };
    }

    // Downsample if needed
    const maxPoints = 200;
    const step = Math.max(1, Math.floor(energyEnvelope.length / maxPoints));
    const points: { x: number; y: number; energy: number }[] = [];

    for (let i = 0; i < energyEnvelope.length; i += step) {
      const x = padding + (i / energyEnvelope.length) * graphWidth;
      const energy = energyEnvelope[i];
      const y = padding + (1 - energy) * graphHeight;
      points.push({ x, y, energy });
    }

    // Create smooth bezier curve
    let pathData = `M ${points[0].x} ${points[0].y}`;

    for (let i = 1; i < points.length; i++) {
      const prev = points[i - 1];
      const curr = points[i];
      const cp1x = prev.x + (curr.x - prev.x) / 3;
      const cp2x = prev.x + ((curr.x - prev.x) * 2) / 3;
      pathData += ` C ${cp1x} ${prev.y} ${cp2x} ${curr.y} ${curr.x} ${curr.y}`;
    }

    // Close path for fill
    const fillPath =
      pathData +
      ` L ${points[points.length - 1].x} ${h - padding} L ${padding} ${h - padding} Z`;

    // Generate gradient stops based on energy
    const stops = points
      .filter((_, i) => i % 10 === 0)
      .map((p, i, arr) => ({
        offset: (i / (arr.length - 1)) * 100,
        color: getEnergyColor(p.energy),
      }));

    return { path: fillPath, gradientStops: stops, width: w, height: h };
  }, [energyEnvelope]);

  // Get segment at current position
  const currentSegment = segments.find(
    (s) => currentTime >= s.start && currentTime < s.end
  );

  const handleClick = (e: React.MouseEvent<SVGSVGElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const fraction = x / rect.width;
    seek(duration * fraction);
  };

  if (energyEnvelope.length === 0) {
    return (
      <div className="h-64 bg-muted/30 rounded-lg flex items-center justify-center">
        <p className="text-muted-foreground">No energy data available</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Current segment indicator */}
      {currentSegment && (
        <div className="flex items-center gap-2">
          <div
            className="w-3 h-3 rounded"
            style={{ backgroundColor: SEGMENT_COLORS[currentSegment.label] }}
          />
          <span className="text-sm font-medium capitalize">{currentSegment.label}</span>
          <span className="text-sm text-muted-foreground">
            Energy: {Math.round(currentSegment.avgEnergy * 100)}%
          </span>
        </div>
      )}

      {/* Energy curve */}
      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="w-full h-64 cursor-pointer"
        onClick={handleClick}
      >
        <defs>
          <linearGradient id="energyGradient" x1="0%" y1="0%" x2="100%" y2="0%">
            {gradientStops.map((stop, i) => (
              <stop key={i} offset={`${stop.offset}%`} stopColor={stop.color} />
            ))}
          </linearGradient>
          <linearGradient id="energyFillGradient" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="url(#energyGradient)" stopOpacity="0.6" />
            <stop offset="100%" stopColor="url(#energyGradient)" stopOpacity="0.1" />
          </linearGradient>
        </defs>

        {/* Background grid */}
        <g className="opacity-20">
          {[0.25, 0.5, 0.75].map((y) => (
            <line
              key={y}
              x1="20"
              y1={20 + (1 - y) * 160}
              x2="780"
              y2={20 + (1 - y) * 160}
              stroke="currentColor"
              strokeDasharray="4 4"
            />
          ))}
        </g>

        {/* Segment backgrounds */}
        {segments.map((segment, idx) => {
          const x = 20 + (segment.start / duration) * 760;
          const segWidth = ((segment.end - segment.start) / duration) * 760;
          return (
            <rect
              key={idx}
              x={x}
              y="20"
              width={segWidth}
              height="160"
              fill={SEGMENT_COLORS[segment.label]}
              opacity="0.1"
            />
          );
        })}

        {/* Energy curve fill */}
        <path d={path} fill="url(#energyFillGradient)" />

        {/* Energy curve stroke */}
        <path
          d={path.replace(/ L [^Z]+Z/, '')}
          fill="none"
          stroke="url(#energyGradient)"
          strokeWidth="3"
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {/* Playhead */}
        <line
          x1={20 + (currentTime / duration) * 760}
          y1="0"
          x2={20 + (currentTime / duration) * 760}
          y2={height}
          stroke="#f97316"
          strokeWidth="2"
        />

        {/* Y-axis labels */}
        <text x="10" y="25" className="text-xs fill-muted-foreground">
          High
        </text>
        <text x="10" y={height - 15} className="text-xs fill-muted-foreground">
          Low
        </text>
      </svg>

      {/* Time axis */}
      <div className="relative h-6 mx-5">
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
    </div>
  );
}

function getEnergyColor(energy: number): string {
  // Low energy: blue, medium: yellow, high: orange/red
  if (energy < 0.3) return '#3B82F6';
  if (energy < 0.5) return '#22C55E';
  if (energy < 0.7) return '#EAB308';
  if (energy < 0.85) return '#F97316';
  return '#EF4444';
}

function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}
