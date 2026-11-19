'use client';

import { useRouter } from 'next/navigation';
import { DropZone } from '@/components/upload/DropZone';
import { MicCapture } from '@/components/upload/MicCapture';
import { useAudioAnalysis } from '@/hooks/useAudioAnalysis';
import { useAnalysisStore } from '@/stores/analysis-store';
import { FeatureBadges } from '@/components/common/FeatureBadges';

export default function Home() {
  const router = useRouter();
  const { analyzeFile, isAnalyzing, analysisProgress, error } = useAudioAnalysis();
  const { currentSong, songs } = useAnalysisStore();

  const handleFileSelect = async (file: File) => {
    const song = await analyzeFile(file);
    if (song) {
      router.push(`/analyze/${song.id}`);
    }
  };

  return (
    <div className="max-w-[1100px] mx-auto">
      {/* Header */}
      <header className="px-1 pt-2 pb-7">
        <div className="label mb-4">Musical DNA Visualizer</div>
        <h1 className="mb-3">Decode the structure of any song.</h1>
        <p className="max-w-[620px]">
          Capture a track from a tab, your mic, or a file. We extract key, tempo, chord progression,
          energy contour, and structural segments, then map similar songs in 3D.
        </p>
      </header>

      {/* Input section */}
      <section className="mb-8">
        {isAnalyzing ? (
          <div className="max-w-[640px]">
            <DropZone
              onFileSelect={handleFileSelect}
              isAnalyzing
              progress={analysisProgress?.progress}
              progressMessage={analysisProgress?.message}
            />
          </div>
        ) : (
          <div className="grid gap-3 md:grid-cols-2">
            <MicCapture onFileSelect={handleFileSelect} disabled={isAnalyzing} />
            <DropZone onFileSelect={handleFileSelect} isAnalyzing={false} />
          </div>
        )}

        {error && (
          <div className="card mt-3">
            <h2 className="mb-1">Analysis failed</h2>
            <p className="error-line">{error}</p>
          </div>
        )}
      </section>

      {/* Current Song */}
      {currentSong && !isAnalyzing && (
        <section className="mb-8">
          <div className="card">
            <div className="flex items-baseline justify-between mb-4">
              <span className="label">Current track</span>
              <span className="label">{Math.round(currentSong.metadata.duration)}s</span>
            </div>
            <div className="text-[22px] font-light tracking-[-0.02em] text-ink mb-3 truncate">
              {currentSong.metadata.filename}
            </div>
            <FeatureBadges song={currentSong} />
            <div className="mt-5 flex flex-wrap gap-2">
              <button
                onClick={() => router.push(`/analyze/${currentSong.id}`)}
                className="btn-primary key"
              >
                Open full analysis
              </button>
              {songs.length > 1 && (
                <button onClick={() => router.push('/explore')} className="btn">
                  Similarity graph
                </button>
              )}
            </div>
          </div>
        </section>
      )}

      {/* Library */}
      {songs.length > 0 && (
        <section>
          <div className="flex items-center justify-between gap-3 px-1 mb-3">
            <div className="flex items-baseline gap-3">
              <h2>Library</h2>
              <span className="label">
                {songs.length} {songs.length === 1 ? 'track' : 'tracks'}
              </span>
            </div>
            {songs.length > 1 && (
              <button onClick={() => router.push('/explore')} className="btn">
                Open similarity graph
              </button>
            )}
          </div>
          <div className="grid gap-3 md:grid-cols-2">
            {songs.map((song) => (
              <button
                key={song.id}
                type="button"
                className="card text-left transition-transform hover:-translate-y-px"
                onClick={() => router.push(`/analyze/${song.id}`)}
              >
                <h3 className="mb-2.5 truncate">{song.metadata.filename}</h3>
                <FeatureBadges song={song} size="sm" />
              </button>
            ))}
          </div>
        </section>
      )}

      {songs.length === 0 && !isAnalyzing && (
        <div className="card pending text-[13px] text-muted-foreground">
          No tracks analyzed yet. Capture or upload one to get started.
        </div>
      )}
    </div>
  );
}
