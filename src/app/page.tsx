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
    <div className="min-h-screen bg-[color:var(--background)]">
      <div className="max-w-[1100px] mx-auto px-10 pt-14 pb-16">
        {/* Header */}
        <header className="mb-12">
          <div className="eyebrow mb-3.5">Musical DNA Visualizer</div>
          <h1 className="text-[36px] font-bold tracking-[-0.025em] leading-[1.1] mb-3.5">
            Decode the structure of any song.
          </h1>
          <p className="text-[15px] text-[color:var(--muted-foreground)] max-w-[640px]">
            Capture a track from a tab, your mic, or a file. We extract key, tempo, chord progression,
            energy contour, and structural segments — then map similar songs in 3D.
          </p>

          {/* Legend */}
          <div className="flex flex-wrap gap-x-7 gap-y-3 mt-5 text-[13px] text-[color:var(--muted-foreground)]">
            <LegendItem swatchClass="bg-[color:var(--accent)]" label="Tonal &amp; harmony" />
            <LegendItem swatchClass="bg-[color:var(--foreground)]" label="Rhythm &amp; energy" />
            <LegendItem swatchClass="bg-[color:var(--track)]" label="Structural segments" />
          </div>
        </header>

        {/* Input section */}
        <section className="mb-14">
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
            <div className="grid gap-4 md:grid-cols-2">
              <MicCapture onFileSelect={handleFileSelect} disabled={isAnalyzing} />
              <DropZone onFileSelect={handleFileSelect} isAnalyzing={false} />
            </div>
          )}

          {error && (
            <div className="mt-4 p-3 bg-[color:var(--destructive)]/10 border border-[color:var(--destructive)]/20 text-[color:var(--destructive)] rounded-md">
              <p className="font-medium text-[13px]">Analysis failed</p>
              <p className="text-[13px] opacity-90">{error}</p>
            </div>
          )}
        </section>

        {/* Current Song */}
        {currentSong && !isAnalyzing && (
          <section className="mb-14">
            <div className="surface-card p-6">
              <div className="flex items-baseline justify-between mb-4">
                <span className="label-mono">Current track</span>
                <span className="label-mono">
                  {Math.round(currentSong.metadata.duration)}s
                </span>
              </div>
              <h2 className="text-[20px] font-bold tracking-tight mb-3 truncate">
                {currentSong.metadata.filename}
              </h2>
              <FeatureBadges song={currentSong} />
              <div className="mt-5 flex gap-2">
                <button
                  onClick={() => router.push(`/analyze/${currentSong.id}`)}
                  className="px-4 py-2 bg-[color:var(--accent-deep)] text-white rounded-md text-[14px] font-medium hover:bg-[color:var(--accent-deep-hover)] transition-colors"
                >
                  Open full analysis
                </button>
                {songs.length > 1 && (
                  <button
                    onClick={() => router.push('/explore')}
                    className="px-4 py-2 bg-white border border-[color:var(--border)] text-[color:var(--foreground)] rounded-md text-[14px] font-medium hover:bg-[color:var(--surface)] transition-colors"
                  >
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
            <div className="flex items-baseline justify-between mb-4">
              <h2 className="text-[20px] font-bold tracking-tight">Library</h2>
              <span className="label-mono">{songs.length} {songs.length === 1 ? 'track' : 'tracks'}</span>
            </div>
            <div className="grid gap-3 md:grid-cols-2">
              {songs.map((song) => (
                <div
                  key={song.id}
                  className="surface-card p-4 cursor-pointer hover:border-[color:var(--accent)]/40 hover:bg-[color:var(--surface)] transition-colors"
                  onClick={() => router.push(`/analyze/${song.id}`)}
                >
                  <h3 className="font-medium text-[14px] mb-2 truncate">{song.metadata.filename}</h3>
                  <FeatureBadges song={song} size="sm" />
                </div>
              ))}
            </div>

            {songs.length > 1 && (
              <div className="mt-6">
                <button
                  onClick={() => router.push('/explore')}
                  className="px-5 py-2.5 bg-[color:var(--accent-deep)] text-white rounded-md text-[14px] font-medium hover:bg-[color:var(--accent-deep-hover)] transition-colors"
                >
                  Open similarity graph ({songs.length})
                </button>
              </div>
            )}
          </section>
        )}

        {songs.length === 0 && !isAnalyzing && (
          <p className="text-[13px] text-[color:var(--muted-strong)]">
            No tracks analyzed yet. Capture or upload one to get started.
          </p>
        )}
      </div>
    </div>
  );
}

function LegendItem({ swatchClass, label }: { swatchClass: string; label: string }) {
  return (
    <div className="flex items-center gap-2.5">
      <span className={`w-3.5 h-3.5 rounded-sm ${swatchClass}`} />
      <span>{label}</span>
    </div>
  );
}
