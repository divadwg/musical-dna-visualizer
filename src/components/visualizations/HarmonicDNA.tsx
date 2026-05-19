'use client';

import { useEffect, useRef, useMemo } from 'react';
import { usePlaybackStore } from '@/stores/playback-store';
import type { KeyFeature, ChordSegment } from '@/types/audio-features';

interface HarmonicDNAProps {
  chromagram: number[][];
  keyInfo: KeyFeature;
  chords: ChordSegment[];
  duration: number;
}

const PITCH_CLASSES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];

// Colors for pitch classes (circle of fifths inspired)
const PITCH_COLORS = [
  '#FF6B6B', // C
  '#FF8E72', // C#
  '#FFB347', // D
  '#FFD93D', // D#
  '#6BCB77', // E
  '#4ECDC4', // F
  '#45B7D1', // F#
  '#4D96FF', // G
  '#6C5CE7', // G#
  '#A29BFE', // A
  '#D980FA', // A#
  '#F368E0', // B
];

export function HarmonicDNA({ chromagram, keyInfo, chords, duration }: HarmonicDNAProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const { currentTime, seek } = usePlaybackStore();

  // Downsample chromagram for visualization
  const displayChromagram = useMemo(() => {
    if (chromagram.length === 0) return [];

    const maxFrames = 200;
    if (chromagram.length <= maxFrames) return chromagram;

    const step = Math.floor(chromagram.length / maxFrames);
    const result: number[][] = [];

    for (let i = 0; i < chromagram.length; i += step) {
      const avgFrame = new Array(12).fill(0);
      const count = Math.min(step, chromagram.length - i);

      for (let j = 0; j < count; j++) {
        for (let k = 0; k < 12; k++) {
          avgFrame[k] += chromagram[i + j]?.[k] || 0;
        }
      }

      result.push(avgFrame.map((v) => v / count));
    }

    return result;
  }, [chromagram]);

  // Draw circular chromagram
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || displayChromagram.length === 0) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const size = 400;
    const dpr = window.devicePixelRatio || 1;
    canvas.width = size * dpr;
    canvas.height = size * dpr;
    canvas.style.width = `${size}px`;
    canvas.style.height = `${size}px`;
    ctx.scale(dpr, dpr);

    const centerX = size / 2;
    const centerY = size / 2;
    const innerRadius = 60;
    const outerRadius = 180;

    // Clear
    ctx.clearRect(0, 0, size, size);

    // Draw chromagram as radial segments
    const numFrames = displayChromagram.length;
    const anglePerPitch = (2 * Math.PI) / 12;
    const radiusPerFrame = (outerRadius - innerRadius) / numFrames;

    for (let frameIdx = 0; frameIdx < numFrames; frameIdx++) {
      const frame = displayChromagram[frameIdx];
      const r1 = innerRadius + frameIdx * radiusPerFrame;
      const r2 = r1 + radiusPerFrame;

      for (let pitchIdx = 0; pitchIdx < 12; pitchIdx++) {
        const value = frame[pitchIdx] || 0;
        const startAngle = pitchIdx * anglePerPitch - Math.PI / 2;
        const endAngle = startAngle + anglePerPitch;

        // Color based on pitch class with intensity from value
        const baseColor = PITCH_COLORS[pitchIdx];
        const alpha = Math.max(0.1, Math.min(1, value));

        ctx.beginPath();
        ctx.arc(centerX, centerY, r2, startAngle, endAngle);
        ctx.arc(centerX, centerY, r1, endAngle, startAngle, true);
        ctx.closePath();

        ctx.fillStyle = hexToRgba(baseColor, alpha);
        ctx.fill();
      }
    }

    // Draw playhead ring
    const playheadRadius =
      innerRadius + (currentTime / duration) * (outerRadius - innerRadius);
    ctx.beginPath();
    ctx.arc(centerX, centerY, playheadRadius, 0, 2 * Math.PI);
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.8)';
    ctx.lineWidth = 2;
    ctx.stroke();

    // Draw pitch class labels
    ctx.font = '12px system-ui';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    for (let i = 0; i < 12; i++) {
      const angle = i * anglePerPitch - Math.PI / 2 + anglePerPitch / 2;
      const labelRadius = outerRadius + 20;
      const x = centerX + Math.cos(angle) * labelRadius;
      const y = centerY + Math.sin(angle) * labelRadius;

      const isKey = PITCH_CLASSES[i] === keyInfo.key;

      ctx.fillStyle = isKey ? '#FFD700' : '#888888';
      ctx.font = isKey ? 'bold 14px system-ui' : '12px system-ui';
      ctx.fillText(PITCH_CLASSES[i], x, y);
    }

    // Draw center info
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 24px system-ui';
    ctx.fillText(keyInfo.key, centerX, centerY - 10);
    ctx.font = '14px system-ui';
    ctx.fillStyle = '#888888';
    ctx.fillText(keyInfo.scale, centerX, centerY + 15);
  }, [displayChromagram, keyInfo, currentTime, duration]);

  const handleClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left - rect.width / 2;
    const y = e.clientY - rect.top - rect.height / 2;
    const distance = Math.sqrt(x * x + y * y);

    const innerRadius = 60;
    const outerRadius = 180;

    if (distance >= innerRadius && distance <= outerRadius) {
      const fraction = (distance - innerRadius) / (outerRadius - innerRadius);
      seek(duration * fraction);
    }
  };

  if (chromagram.length === 0) {
    return (
      <div className="h-96 bg-muted/30 rounded-lg flex items-center justify-center">
        <p className="text-muted-foreground">No harmonic data available</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col lg:flex-row gap-8 items-center">
      {/* Circular chromagram */}
      <div className="flex-shrink-0">
        <canvas
          ref={canvasRef}
          className="cursor-pointer"
          onClick={handleClick}
        />
      </div>

      {/* Chord progression */}
      <div className="flex-1 space-y-4">
        <h3 className="font-medium">Chord Progression</h3>
        <div className="flex flex-wrap gap-2">
          {chords.slice(0, 20).map((chord, idx) => {
            const isActive =
              currentTime >= chord.start && currentTime < chord.end;

            return (
              <button
                key={idx}
                onClick={() => seek(chord.start)}
                className={`px-3 py-1.5 rounded-lg text-sm font-mono transition-all ${
                  isActive
                    ? 'bg-primary text-primary-foreground scale-110'
                    : 'bg-muted hover:bg-muted/80'
                }`}
              >
                {chord.chord}
              </button>
            );
          })}
          {chords.length > 20 && (
            <span className="px-3 py-1.5 text-sm text-muted-foreground">
              +{chords.length - 20} more
            </span>
          )}
        </div>

        {/* Key info */}
        <div className="space-y-2">
          <h3 className="font-medium">Key Analysis</h3>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-muted-foreground">Detected Key:</span>
              <span className="ml-2 font-mono">
                {keyInfo.key} {keyInfo.scale}
              </span>
            </div>
            <div>
              <span className="text-muted-foreground">Confidence:</span>
              <span className="ml-2">{Math.round(keyInfo.strength * 100)}%</span>
            </div>
          </div>
        </div>

        {/* Pitch class legend */}
        <div className="space-y-2">
          <h3 className="font-medium">Pitch Classes</h3>
          <div className="flex flex-wrap gap-1.5">
            {PITCH_CLASSES.map((pitch, idx) => (
              <div
                key={pitch}
                className={`flex items-center gap-1 px-2 py-1 rounded text-xs ${
                  pitch === keyInfo.key ? 'ring-2 ring-yellow-400' : ''
                }`}
              >
                <div
                  className="w-3 h-3 rounded"
                  style={{ backgroundColor: PITCH_COLORS[idx] }}
                />
                <span>{pitch}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function hexToRgba(hex: string, alpha: number): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}
