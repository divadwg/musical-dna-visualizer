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
    return (
      <div className="surface-card p-6 flex flex-col gap-5">
        <div className="flex items-baseline justify-between">
          <span className="label-mono">02 / Analyzing</span>
          <span className="label-mono">{Math.round((progress || 0) * 100)}%</span>
        </div>
        <div className="flex flex-col gap-1">
          <h3 className="text-[18px] font-bold tracking-tight">Extracting musical DNA</h3>
          <p className="text-[13px] text-[color:var(--muted-foreground)]">
            {progressMessage || 'Analyzing audio…'}
          </p>
        </div>
        <div className="h-[3px] bg-[color:var(--surface-raised)] rounded-full overflow-hidden">
          <div
            className="h-full bg-[color:var(--accent)] transition-[width] duration-200"
            style={{ width: `${(progress || 0) * 100}%` }}
          />
        </div>
      </div>
    );
  }

  return (
    <div
      className={cn(
        'surface-card p-6 flex flex-col gap-5 cursor-pointer transition-colors',
        isDragging && 'border-[color:var(--accent)] bg-[color:var(--accent-light)]'
      )}
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
        <span className="label-mono">02 / Upload</span>
        <span className="label-mono">max 100MB</span>
      </div>

      <div className="flex flex-col gap-1">
        <h3 className="text-[18px] font-bold tracking-tight">
          {isDragging ? 'Drop to analyze' : 'Upload a file'}
        </h3>
        <p className="text-[13px] text-[color:var(--muted-foreground)]">
          Drag &amp; drop an audio file, or click to browse. MP3, WAV, OGG, FLAC, M4A.
        </p>
      </div>

      <div className="flex items-center justify-center py-6 border border-dashed border-[color:var(--border)] rounded-md bg-[color:var(--surface)]">
        <svg
          className="w-8 h-8 text-[color:var(--muted-strong)]"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.5}
            d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3"
          />
        </svg>
      </div>

      <button
        type="button"
        className="w-full px-4 py-2.5 bg-white border border-[color:var(--border)] text-[color:var(--foreground)] rounded-md text-[14px] font-medium hover:bg-[color:var(--surface)] transition-colors"
        onClick={(e) => {
          e.stopPropagation();
          document.getElementById('file-input')?.click();
        }}
      >
        Browse files
      </button>

      {error && (
        <p className="text-[13px] text-[color:var(--destructive)] bg-[color:var(--destructive)]/10 px-3 py-2 rounded-md">
          {error}
        </p>
      )}
    </div>
  );
}
