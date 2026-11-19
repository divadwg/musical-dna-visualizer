'use client';

import { useCallback, useState } from 'react';
import { cn } from '@/lib/utils';

interface DropZoneProps {
  onFileSelect: (file: File) => void;
  isAnalyzing?: boolean;
  progress?: number;
  progressMessage?: string;
}

const ACCEPTED_TYPES = ['audio/mpeg', 'audio/wav', 'audio/ogg', 'audio/flac', 'audio/mp4', 'audio/aac', 'audio/webm'];
const ACCEPTED_EXTENSIONS = ['.mp3', '.wav', '.ogg', '.flac', '.m4a', '.aac', '.webm'];

export function DropZone({ onFileSelect, isAnalyzing, progress, progressMessage }: DropZoneProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const validateFile = (file: File): boolean => {
    if (!ACCEPTED_TYPES.includes(file.type)) {
      const ext = file.name.toLowerCase().slice(file.name.lastIndexOf('.'));
      if (!ACCEPTED_EXTENSIONS.includes(ext)) {
        setError(`Unsupported file type. Use: ${ACCEPTED_EXTENSIONS.join(', ')}`);
        return false;
      }
    }
    if (file.size > 100 * 1024 * 1024) {
      setError('File too large. Maximum size is 100MB.');
      return false;
    }
    setError(null);
    return true;
  };

  const handleFile = useCallback(
    (file: File) => {
      if (validateFile(file)) onFileSelect(file);
    },
    [onFileSelect]
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      const file = e.dataTransfer.files[0];
      if (file) handleFile(file);
    },
    [handleFile]
  );

  if (isAnalyzing) {
    const pct = Math.round((progress || 0) * 100);
    return (
      <div className="card flex flex-col gap-5">
        <div className="flex items-center justify-between">
          <span className="label">02 / Analyzing</span>
          <span className="status ok">Working</span>
        </div>
        <div className="flex items-end justify-between gap-4">
          <div className="flex flex-col gap-1">
            <h2>Extracting musical DNA</h2>
            <p className="text-[13px] text-muted-foreground">
              {progressMessage || 'Analyzing audio…'}
            </p>
          </div>
          <div className="stat-sm tabular-nums">
            {pct}
            <span className="text-[15px] text-muted-foreground ml-0.5">%</span>
          </div>
        </div>
        <div className="track">
          <div className="transition-[width] duration-200" style={{ width: `${pct}%` }} />
        </div>
      </div>
    );
  }

  return (
    <div
      className="card flex flex-col gap-5 cursor-pointer"
      onDrop={handleDrop}
      onDragOver={(e) => {
        e.preventDefault();
        setIsDragging(true);
      }}
      onDragLeave={(e) => {
        e.preventDefault();
        setIsDragging(false);
      }}
      onClick={() => document.getElementById('file-input')?.click()}
    >
      <input
        id="file-input"
        type="file"
        accept={ACCEPTED_TYPES.join(',')}
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) handleFile(file);
        }}
        className="hidden"
      />

      <div className="flex items-baseline justify-between">
        <span className="label">02 / Upload</span>
        <span className="label">max 100MB</span>
      </div>

      <div className="flex flex-col gap-1">
        <h2>{isDragging ? 'Drop to analyze' : 'Upload a file'}</h2>
        <p className="text-[13px] text-muted-foreground">
          Drag &amp; drop an audio file, or click to browse. MP3, WAV, OGG, FLAC, M4A.
        </p>
      </div>

      {/* Drop target: dashed while waiting, a raised white slab once a file is over it */}
      <div
        className={cn(
          'flex flex-1 min-h-[120px] items-center justify-center rounded-[12px] transition-all',
          isDragging
            ? 'bg-white shadow-[var(--sh-raised)] border border-transparent'
            : 'border border-dashed border-[#cfd1d5]'
        )}
      >
        <div className="tile">
          <svg
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={1.5}
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden
          >
            <path d="M9 18V5l11-2v13" />
            <circle cx="6.5" cy="18" r="2.5" />
            <circle cx="17.5" cy="16" r="2.5" />
          </svg>
        </div>
      </div>

      <button
        type="button"
        className="btn w-full"
        onClick={(e) => {
          e.stopPropagation();
          document.getElementById('file-input')?.click();
        }}
      >
        Browse files
      </button>

      {error && <p className="error-line">{error}</p>}
    </div>
  );
}
