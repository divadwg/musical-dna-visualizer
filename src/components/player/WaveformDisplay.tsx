'use client';

import { useEffect, useRef, useMemo } from 'react';
import { usePlaybackStore } from '@/stores/playback-store';
import type { SongSegment } from '@/types/audio-features';
import { cssVar, formatTime } from '@/lib/theme';

interface WaveformDisplayProps {
  segments?: SongSegment[];
  beats?: number[];
  onSeek?: (time: number) => void;
}

export function WaveformDisplay({ segments = [], beats = [], onSeek }: WaveformDisplayProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const { audioBuffer, currentTime, duration, isPlaying } = usePlaybackStore();

  // Compute waveform data
  const waveformData = useMemo(() => {
    if (!audioBuffer) return null;

    const rawData = audioBuffer.getChannelData(0);
    const samples = 500; // Number of bars
    const blockSize = Math.floor(rawData.length / samples);
    const filteredData: number[] = [];

    for (let i = 0; i < samples; i++) {
      const blockStart = blockSize * i;
      let sum = 0;
      for (let j = 0; j < blockSize; j++) {
        sum += Math.abs(rawData[blockStart + j]);
      }
      filteredData.push(sum / blockSize);
    }

    // Normalize
    const max = Math.max(...filteredData);
    return filteredData.map((d) => d / max);
  }, [audioBuffer]);

  // Draw waveform
  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container || !waveformData) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set canvas size
    const rect = container.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    canvas.style.width = `${rect.width}px`;
    canvas.style.height = `${rect.height}px`;
    ctx.scale(dpr, dpr);

    const width = rect.width;
    const height = rect.height;
    const ink = cssVar('--ink');
    const faint = cssVar('--faint');
    const muted = cssVar('--muted');
    const line = cssVar('--line');
    const playheadX = duration > 0 ? (currentTime / duration) * width : 0;

    // Layout: labels on top, the tick strip in the middle, a row of beat dots at the foot
    const top = 22;
    const bottom = height - 14;
    const mid = (top + bottom) / 2;
    const maxBar = bottom - top;

    ctx.clearRect(0, 0, width, height);

    // Segment boundaries (hairlines) and labels
    ctx.font = `500 9px ${cssVar('--f-mono')}`;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'alphabetic';
    if (duration > 0) {
      for (const segment of segments) {
        const x = Math.round((segment.start / duration) * width) + 0.5;
        const segWidth = ((segment.end - segment.start) / duration) * width;
        if (segment.start > 0) {
          ctx.strokeStyle = line;
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.moveTo(x, 0);
          ctx.lineTo(x, bottom);
          ctx.stroke();
        }
        const text = segment.label.toUpperCase();
        if (ctx.measureText(text).width + 10 < segWidth) {
          ctx.fillStyle = muted;
          ctx.fillText(text, x + 5, 10);
        }
      }
    }

    // Waveform as a tick strip: 3px ticks, 2px gaps. Played ticks are ink, the rest faint.
    const pitch = 5;
    const tickCount = Math.max(1, Math.floor(width / pitch));
    for (let i = 0; i < tickCount; i++) {
      const from = Math.floor((i / tickCount) * waveformData.length);
      const to = Math.max(from + 1, Math.floor(((i + 1) / tickCount) * waveformData.length));
      let peak = 0;
      for (let j = from; j < to; j++) peak = Math.max(peak, waveformData[j] || 0);

      const x = i * pitch;
      const barHeight = Math.max(2, peak * maxBar);
      ctx.fillStyle = x + 1.5 < playheadX ? ink : faint;
      ctx.fillRect(x, mid - barHeight / 2, 3, barHeight);
    }

    // Beats: a row of small dots at the foot
    if (duration > 0) {
      ctx.fillStyle = faint;
      for (const beat of beats) {
        const x = (beat / duration) * width;
        ctx.beginPath();
        ctx.arc(x, height - 5, 1, 0, Math.PI * 2);
        ctx.fill();
      }

      // "Now" line: 1px ink with a lime dot at its foot
      const px = Math.round(playheadX) + 0.5;
      ctx.strokeStyle = ink;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(px, 14);
      ctx.lineTo(px, height - 5);
      ctx.stroke();

      ctx.beginPath();
      ctx.arc(px, height - 5, 3.5, 0, Math.PI * 2);
      ctx.fillStyle = cssVar('--lime');
      ctx.fill();
      ctx.strokeStyle = cssVar('--lime-deep');
      ctx.stroke();
    }
  }, [waveformData, currentTime, duration, segments, beats]);

  // Update current time during playback
  useEffect(() => {
    if (!isPlaying) return;

    const { audioContext, startedAt } = usePlaybackStore.getState();
    if (!audioContext) return;

    let animationFrame: number;

    const updateTime = () => {
      const state = usePlaybackStore.getState();
      if (state.isPlaying && state.audioContext) {
        const elapsed = state.audioContext.currentTime - state.startedAt;
        usePlaybackStore.getState().setCurrentTime(elapsed);
        animationFrame = requestAnimationFrame(updateTime);
      }
    };

    animationFrame = requestAnimationFrame(updateTime);

    return () => {
      cancelAnimationFrame(animationFrame);
    };
  }, [isPlaying]);

  const handleClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!duration || !canvasRef.current) return;

    const rect = canvasRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const seekTime = (x / rect.width) * duration;

    onSeek?.(seekTime);
    usePlaybackStore.getState().seek(seekTime);
  };

  if (!audioBuffer) {
    return (
      <div className="h-32 well flex items-center justify-center">
        <p className="label">No audio loaded</p>
      </div>
    );
  }

  return (
    <div>
      <div ref={containerRef} className="relative h-32">
        <canvas
          ref={canvasRef}
          className="w-full h-full cursor-pointer"
          onClick={handleClick}
        />
      </div>
      <div className="flex justify-between mt-2">
        <span className="tip key">{formatTime(currentTime)}</span>
        <span className="label self-center">{formatTime(duration)}</span>
      </div>
    </div>
  );
}
