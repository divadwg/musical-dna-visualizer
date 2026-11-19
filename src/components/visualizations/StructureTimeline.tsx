'use client';

import { useRef } from 'react';
import { usePlaybackStore } from '@/stores/playback-store';
import type { SongSegment } from '@/types/audio-features';
import { formatTime } from '@/lib/theme';

interface StructureTimelineProps {
  segments: SongSegment[];
  duration: number;
  beats: number[];
}

export function StructureTimeline({ segments, duration, beats }: StructureTimelineProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const { currentTime, seek } = usePlaybackStore();

  const handleClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const seekTime = Math.max(0, Math.min(1, x / rect.width)) * duration;
    seek(seekTime);
  };

  const fraction = duration > 0 ? Math.max(0, Math.min(1, currentTime / duration)) : 0;
  const tipShift = fraction < 0.04 ? '0%' : fraction > 0.96 ? '-100%' : '-50%';

  return (
    <div className="space-y-2">
      {/* Main timeline: a well holding one raised slab per section */}
      <div className="well p-1 mt-8">
        <div
          ref={containerRef}
          className="relative h-24 cursor-pointer"
          onClick={handleClick}
        >
          {segments.map((segment, idx) => {
            const left = (segment.start / duration) * 100;
            const width = ((segment.end - segment.start) / duration) * 100;
            const isCurrent = currentTime >= segment.start && currentTime < segment.end;

            return (
              <div
                key={idx}
                className="absolute top-0 h-full px-px"
                style={{ left: `${left}%`, width: `${width}%` }}
                title={`${segment.label} · ${formatTime(segment.end - segment.start)}`}
              >
                <div
                  className={`h-full rounded-[9px] flex flex-col items-center justify-center gap-1.5 overflow-hidden shadow-[var(--sh-raised)] ${
                    isCurrent ? 'bg-white' : 'bg-card'
                  }`}
                >
                  <span className={`label ${isCurrent ? '!text-ink' : ''}`}>{segment.label}</span>
                  <span className="mono text-[11px] text-muted-foreground">
                    {formatTime(segment.end - segment.start)}
                  </span>
                </div>
              </div>
            );
          })}

          {/* "Now" line: tooltip at the head, lime dot at the foot */}
          <div
            className="absolute -top-1 -bottom-1 w-px bg-ink z-10 pointer-events-none"
            style={{ left: `${fraction * 100}%` }}
          >
            <span
              className="tip key absolute bottom-full mb-1.5 left-0"
              style={{ transform: `translateX(${tipShift})` }}
            >
              {formatTime(currentTime)}
            </span>
            <span className="absolute -bottom-1 -left-[3px] w-[7px] h-[7px] rounded-full bg-lime shadow-[0_0_0_1px_var(--lime-deep)_inset]" />
          </div>
        </div>
      </div>

      {/* Beats: a tick strip */}
      <div className="relative h-2.5 mx-1" aria-hidden>
        {beats.slice(0, 200).map((beat, idx) => (
          <div
            key={idx}
            className="absolute top-0 h-full w-px bg-faint"
            style={{ left: `${(beat / duration) * 100}%` }}
          />
        ))}
      </div>

      {/* Time axis */}
      <div className="relative h-4 mx-1">
        {[0, 0.25, 0.5, 0.75, 1].map((f) => (
          <div
            key={f}
            className="label absolute !text-[9px]"
            style={{
              left: `${f * 100}%`,
              transform: `translateX(${f === 0 ? '0' : f === 1 ? '-100%' : '-50%'})`,
            }}
          >
            {formatTime(duration * f)}
          </div>
        ))}
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-4 pt-2">
        <span className="label flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-lime shadow-[0_0_0_1px_var(--lime-deep)_inset]" />
          Now
        </span>
        <span className="label flex items-center gap-1.5">
          <span className="w-px h-2.5 bg-faint" />
          Beat
        </span>
      </div>
    </div>
  );
}
