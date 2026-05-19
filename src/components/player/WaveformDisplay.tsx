'use client';

import { useEffect, useRef, useMemo } from 'react';
import { usePlaybackStore } from '@/stores/playback-store';
import type { SongSegment } from '@/types/audio-features';

interface WaveformDisplayProps {
  segments?: SongSegment[];
  beats?: number[];
  onSeek?: (time: number) => void;
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
    const barWidth = width / waveformData.length;
    const playheadX = duration > 0 ? (currentTime / duration) * width : 0;

    // Clear
    ctx.clearRect(0, 0, width, height);

    // Draw segment backgrounds
    for (const segment of segments) {
      const x = (segment.start / duration) * width;
      const segWidth = ((segment.end - segment.start) / duration) * width;
      ctx.fillStyle = SEGMENT_COLORS[segment.label] + '20'; // 20% opacity
      ctx.fillRect(x, 0, segWidth, height);
    }

    // Draw waveform bars
    for (let i = 0; i < waveformData.length; i++) {
      const x = i * barWidth;
      const barHeight = waveformData[i] * height * 0.8;

      // Color based on playhead position
      const isPast = x < playheadX;
      ctx.fillStyle = isPast ? '#f97316' : '#64748b';

      // Draw mirrored bar
      ctx.fillRect(x, (height - barHeight) / 2, barWidth - 1, barHeight);
    }

    // Draw beat markers
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
    ctx.lineWidth = 1;
    for (const beat of beats) {
      const x = (beat / duration) * width;
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, height);
      ctx.stroke();
    }

    // Draw playhead
    if (duration > 0) {
      ctx.strokeStyle = '#f97316';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(playheadX, 0);
      ctx.lineTo(playheadX, height);
      ctx.stroke();

      // Playhead glow
      ctx.shadowColor = '#f97316';
      ctx.shadowBlur = 10;
      ctx.stroke();
      ctx.shadowBlur = 0;
    }

    // Draw segment labels
    ctx.font = '10px system-ui';
    ctx.textAlign = 'center';
    for (const segment of segments) {
      const x = ((segment.start + segment.end) / 2 / duration) * width;
      ctx.fillStyle = SEGMENT_COLORS[segment.label];
      ctx.fillText(segment.label.toUpperCase(), x, 12);
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
      <div className="h-32 bg-muted/50 rounded-lg flex items-center justify-center">
        <p className="text-muted-foreground">No audio loaded</p>
      </div>
    );
  }

  return (
    <div ref={containerRef} className="relative h-32 bg-muted/20 rounded-lg overflow-hidden">
      <canvas
        ref={canvasRef}
        className="w-full h-full cursor-pointer"
        onClick={handleClick}
      />

      {/* Time display */}
      <div className="absolute bottom-2 left-2 text-xs text-muted-foreground font-mono">
        {formatTime(currentTime)} / {formatTime(duration)}
      </div>
    </div>
  );
}

function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}
