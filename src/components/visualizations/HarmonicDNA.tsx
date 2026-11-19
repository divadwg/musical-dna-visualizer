'use client';

import { useEffect, useRef, useMemo } from 'react';
import { usePlaybackStore } from '@/stores/playback-store';
import type { KeyFeature, ChordSegment } from '@/types/audio-features';
import { cssVar } from '@/lib/theme';

interface HarmonicDNAProps {
  chromagram: number[][];
  keyInfo: KeyFeature;
  chords: ChordSegment[];
  duration: number;
}

const PITCH_CLASSES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];

// Polar dot matrix: time runs outward in rings, each pitch class owns a 30° sector
const RINGS = 18;
const DOTS_PER_PITCH = 3;
const INNER_RADIUS = 60;
const OUTER_RADIUS = 180;

export function HarmonicDNA({ chromagram, keyInfo, chords, duration }: HarmonicDNAProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const { currentTime, seek } = usePlaybackStore();

  // Average the chromagram down to one frame per ring
  const displayChromagram = useMemo(() => {
    if (chromagram.length === 0) return [];

    const rings = Math.min(RINGS, chromagram.length);
    const result: number[][] = [];

    for (let r = 0; r < rings; r++) {
      const from = Math.floor((r / rings) * chromagram.length);
      const to = Math.max(from + 1, Math.floor(((r + 1) / rings) * chromagram.length));
      const avgFrame = new Array(12).fill(0);
      for (let i = from; i < to; i++) {
        for (let k = 0; k < 12; k++) avgFrame[k] += chromagram[i]?.[k] || 0;
      }
      result.push(avgFrame.map((v) => v / (to - from)));
    }

    return result;
  }, [chromagram]);

  // Draw circular chromagram
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || displayChromagram.length === 0) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const size = 420;
    const dpr = window.devicePixelRatio || 1;
    canvas.width = size * dpr;
    canvas.height = size * dpr;
    ctx.scale(dpr, dpr);

    const ink = cssVar('--ink');
    const faint = cssVar('--faint');
    const muted = cssVar('--muted');
    const sans = cssVar('--f-sans');
    const mono = cssVar('--f-mono');

    const centerX = size / 2;
    const centerY = size / 2;

    ctx.clearRect(0, 0, size, size);

    // Dot size carries the strength of each pitch class; quiet cells stay as the faint grid
    const numFrames = displayChromagram.length;
    const anglePerPitch = (2 * Math.PI) / 12;
    const radiusPerFrame = (OUTER_RADIUS - INNER_RADIUS) / numFrames;

    for (let frameIdx = 0; frameIdx < numFrames; frameIdx++) {
      const frame = displayChromagram[frameIdx];
      const radius = INNER_RADIUS + (frameIdx + 0.5) * radiusPerFrame;

      for (let pitchIdx = 0; pitchIdx < 12; pitchIdx++) {
        const value = Math.max(0, Math.min(1, frame[pitchIdx] || 0));
        const startAngle = pitchIdx * anglePerPitch - Math.PI / 2;
        const strong = value >= 0.15;

        ctx.fillStyle = strong ? ink : faint;
        for (let d = 0; d < DOTS_PER_PITCH; d++) {
          const angle = startAngle + ((d + 0.5) / DOTS_PER_PITCH) * anglePerPitch;
          ctx.beginPath();
          ctx.arc(
            centerX + Math.cos(angle) * radius,
            centerY + Math.sin(angle) * radius,
            strong ? 0.8 + value * 2.2 : 0.8,
            0,
            2 * Math.PI
          );
          ctx.fill();
        }
      }
    }

    // "Now" ring: 1px ink with a lime dot at twelve o'clock
    const playheadRadius =
      INNER_RADIUS +
      (duration > 0 ? Math.max(0, Math.min(1, currentTime / duration)) : 0) *
        (OUTER_RADIUS - INNER_RADIUS);
    ctx.beginPath();
    ctx.arc(centerX, centerY, playheadRadius, 0, 2 * Math.PI);
    ctx.strokeStyle = ink;
    ctx.lineWidth = 1;
    ctx.stroke();

    ctx.beginPath();
    ctx.arc(centerX, centerY - playheadRadius, 3.5, 0, 2 * Math.PI);
    ctx.fillStyle = cssVar('--lime');
    ctx.fill();
    ctx.strokeStyle = cssVar('--lime-deep');
    ctx.stroke();

    // Pitch class labels; the detected key is ink, the rest muted
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    for (let i = 0; i < 12; i++) {
      const angle = i * anglePerPitch - Math.PI / 2 + anglePerPitch / 2;
      const labelRadius = OUTER_RADIUS + 18;
      const x = centerX + Math.cos(angle) * labelRadius;
      const y = centerY + Math.sin(angle) * labelRadius;

      const isKey = PITCH_CLASSES[i] === keyInfo.key;

      ctx.fillStyle = isKey ? ink : muted;
      ctx.font = `500 ${isKey ? 12 : 10}px ${mono}`;
      ctx.fillText(PITCH_CLASSES[i], x, y);
    }

    // Centre: the key as a light stat, the scale as a mono label
    ctx.fillStyle = ink;
    ctx.font = `300 34px ${sans}`;
    ctx.fillText(keyInfo.key, centerX, centerY - 8);
    ctx.font = `500 10px ${mono}`;
    ctx.fillStyle = muted;
    ctx.fillText(keyInfo.scale.toUpperCase(), centerX, centerY + 20);
  }, [displayChromagram, keyInfo, currentTime, duration]);

  const handleClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left - rect.width / 2;
    const y = e.clientY - rect.top - rect.height / 2;
    const distance = Math.sqrt(x * x + y * y);

    // The canvas can be scaled down by CSS, so work in drawing units
    const scale = 420 / rect.width;
    const r = distance * scale;

    if (r >= INNER_RADIUS && r <= OUTER_RADIUS) {
      const fraction = (r - INNER_RADIUS) / (OUTER_RADIUS - INNER_RADIUS);
      seek(duration * fraction);
    }
  };

  if (chromagram.length === 0) {
    return (
      <div className="h-96 well flex items-center justify-center">
        <p className="label">No harmonic data available</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col lg:flex-row gap-8 items-center lg:items-start">
      {/* Circular chromagram */}
      <div className="flex-shrink-0 w-full max-w-[420px]">
        <canvas
          ref={canvasRef}
          className="cursor-pointer w-full h-auto aspect-square"
          onClick={handleClick}
        />
        <p className="label text-center !leading-relaxed mt-1">
          Rings run from start (centre) to end (edge)
        </p>
      </div>

      {/* Chord progression */}
      <div className="flex-1 min-w-0 space-y-6 w-full">
        <div>
          <div className="label mb-3">Chord progression</div>
          <div className="well p-1.5 flex flex-wrap gap-1">
            {chords.slice(0, 20).map((chord, idx) => {
              const isActive =
                currentTime >= chord.start && currentTime < chord.end;

              return (
                <button
                  key={idx}
                  onClick={() => seek(chord.start)}
                  aria-pressed={isActive}
                  className={`mono px-3 py-1.5 rounded-[9px] ${
                    isActive
                      ? 'bg-white text-ink shadow-[var(--sh-raised)]'
                      : 'text-body hover:text-ink'
                  }`}
                >
                  {chord.chord}
                </button>
              );
            })}
            {chords.length > 20 && (
              <span className="mono px-3 py-1.5 text-muted-foreground">
                +{chords.length - 20} more
              </span>
            )}
          </div>
        </div>

        {/* Key info */}
        <div>
          <div className="label mb-1">Key analysis</div>
          <dl className="rows">
            <div>
              <dt>Detected key</dt>
              <dd>
                {keyInfo.key} {keyInfo.scale}
              </dd>
            </div>
            <div>
              <dt>Confidence</dt>
              <dd>{Math.round(keyInfo.strength * 100)}%</dd>
            </div>
          </dl>
        </div>

        {/* Legend */}
        <div className="flex flex-wrap gap-4">
          <span className="label flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-ink" />
            Pitch class strength
          </span>
          <span className="label flex items-center gap-1.5">
            <span className="w-[3px] h-[3px] rounded-full bg-faint" />
            Quiet
          </span>
          <span className="label flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-lime shadow-[0_0_0_1px_var(--lime-deep)_inset]" />
            Now
          </span>
        </div>
      </div>
    </div>
  );
}
