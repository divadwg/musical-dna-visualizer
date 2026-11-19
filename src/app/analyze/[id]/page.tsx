'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAnalysisStore } from '@/stores/analysis-store';
import { usePlaybackStore } from '@/stores/playback-store';
import { getAudioBlob } from '@/db';
import { Card } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { FeatureBadges } from '@/components/common/FeatureBadges';
import { WaveformDisplay } from '@/components/player/WaveformDisplay';
import { PlaybackControls } from '@/components/player/PlaybackControls';
import { StructureTimeline } from '@/components/visualizations/StructureTimeline';
import { EnergyArc } from '@/components/visualizations/EnergyArc';
import { HarmonicDNA } from '@/components/visualizations/HarmonicDNA';

export default function AnalyzePage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const { getSongById, selectSong, songs } = useAnalysisStore();
  const { setAudioBuffer, cleanup } = usePlaybackStore();
  const [isLoading, setIsLoading] = useState(true);

  const song = getSongById(id);

  useEffect(() => {
    if (!song) {
      // Song not found, redirect to home
      router.push('/');
      return;
    }

    selectSong(id);

    // Load audio for playback
    const loadAudio = async () => {
      const blob = await getAudioBlob(id);
      if (blob) {
        const audioContext = new AudioContext();
        const arrayBuffer = await blob.arrayBuffer();
        const buffer = await audioContext.decodeAudioData(arrayBuffer);
        setAudioBuffer(buffer);
        audioContext.close();
      }
      setIsLoading(false);
    };

    loadAudio();

    return () => {
      cleanup();
    };
  }, [id, song, selectSong, setAudioBuffer, cleanup, router]);

  if (!song) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <p className="label">Loading…</p>
      </div>
    );
  }

  const segmentCounts = Object.entries(
    song.timeline.segments.reduce(
      (acc, seg) => {
        acc[seg.label] = (acc[seg.label] || 0) + 1;
        return acc;
      },
      {} as Record<string, number>
    )
  );

  return (
    <div className="max-w-[1100px] mx-auto">
      {/* Header */}
      <div className="flex items-start gap-3 px-1 pt-2 pb-6">
        <button
          onClick={() => router.push('/')}
          className="btn btn-icon"
          aria-label="Back to library"
          title="Back to library"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
            <path d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <div className="flex-1 min-w-0">
          <div className="label mb-2 mt-1">Analysis</div>
          <h1 className="!text-[28px] truncate mb-3">{song.metadata.filename}</h1>
          <FeatureBadges song={song} />
        </div>
        <PlaybackControls />
      </div>

      {/* Waveform */}
      <Card className="mb-3">
        <div className="flex items-baseline justify-between mb-3">
          <span className="label">Waveform</span>
          <span className="label">{isLoading ? 'Loading audio…' : 'Click to seek'}</span>
        </div>
        <WaveformDisplay
          segments={song.timeline.segments}
          beats={song.features.beats.slice(0, 200)}
        />
      </Card>

      {/* Visualization Tabs */}
      <Tabs defaultValue="structure" className="gap-3">
        <TabsList className="my-2">
          <TabsTrigger value="structure">Structure</TabsTrigger>
          <TabsTrigger value="energy">Energy arc</TabsTrigger>
          <TabsTrigger value="harmonic">Harmonic DNA</TabsTrigger>
          <TabsTrigger value="details">Details</TabsTrigger>
        </TabsList>

        <TabsContent value="structure">
          <Card>
            <h2 className="mb-1">Song structure</h2>
            <p className="text-[13px] text-muted-foreground">
              Detected sections based on energy and harmonic changes
            </p>
            <StructureTimeline
              segments={song.timeline.segments}
              duration={song.metadata.duration}
              beats={song.features.beats}
            />
          </Card>
        </TabsContent>

        <TabsContent value="energy">
          <Card>
            <h2 className="mb-1">Energy arc</h2>
            <p className="text-[13px] text-muted-foreground mb-4">
              The emotional intensity journey through the track
            </p>
            <EnergyArc
              energyEnvelope={song.timeline.energyEnvelope}
              segments={song.timeline.segments}
              duration={song.metadata.duration}
            />
          </Card>
        </TabsContent>

        <TabsContent value="harmonic">
          <Card>
            <h2 className="mb-1">Harmonic DNA</h2>
            <p className="text-[13px] text-muted-foreground mb-4">
              Pitch class distribution over time (chromagram)
            </p>
            <HarmonicDNA
              chromagram={song.timeline.chromagram}
              keyInfo={song.features.key}
              chords={song.features.chords}
              duration={song.metadata.duration}
            />
          </Card>
        </TabsContent>

        <TabsContent value="details">
          <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
            <DetailCard
              label="Tempo & rhythm"
              stat={Math.round(song.features.tempo.bpm)}
              unit="BPM"
              rows={[
                ['Confidence', `${Math.round(song.features.tempo.confidence * 100)}%`],
                ['Beat count', song.features.beats.length],
              ]}
            />
            <DetailCard
              label="Key & harmony"
              stat={song.features.key.key}
              unit={song.features.key.scale}
              rows={[
                ['Confidence', `${Math.round(song.features.key.strength * 100)}%`],
                ['Chord changes', song.features.chords.length],
              ]}
            />
            <DetailCard
              label="Loudness"
              stat={song.features.loudness.integrated.toFixed(1)}
              unit="dB integrated"
              rows={[
                ['Peak', `${song.features.loudness.peak.toFixed(1)} dB`],
                ['Range', `${song.features.loudness.range.toFixed(1)} LU`],
              ]}
            />
            <DetailCard
              label="Spectral features"
              stat={song.features.spectral.centroidMean.toFixed(0)}
              unit="Hz brightness"
              rows={[
                ['Flatness', `${(song.features.spectral.flatnessMean * 100).toFixed(1)}%`],
                ['Rolloff', `${song.features.spectral.rolloffMean.toFixed(0)} Hz`],
              ]}
            />
            <DetailCard
              label="File info"
              stat={formatDuration(song.metadata.duration)}
              unit="duration"
              rows={[
                ['Sample rate', `${song.metadata.sampleRate} Hz`],
                ['File size', formatFileSize(song.metadata.fileSize)],
              ]}
            />
            <DetailCard
              label="Structure summary"
              stat={song.timeline.segments.length}
              unit="sections"
              rows={segmentCounts.map(([label, count]) => [label, count])}
            />
          </div>
        </TabsContent>
      </Tabs>

      {/* Navigation to other songs */}
      {songs.length > 1 && (
        <div className="mt-8">
          <h2 className="px-1 mb-3">Other songs</h2>
          <div className="grid gap-3 md:grid-cols-3">
            {songs
              .filter((s) => s.id !== id)
              .slice(0, 3)
              .map((s) => (
                <button
                  key={s.id}
                  type="button"
                  className="card text-left transition-transform hover:-translate-y-px"
                  onClick={() => router.push(`/analyze/${s.id}`)}
                >
                  <h3 className="mb-2.5 truncate">{s.metadata.filename}</h3>
                  <FeatureBadges song={s} size="sm" />
                </button>
              ))}
          </div>
        </div>
      )}
    </div>
  );
}

function DetailCard({
  label,
  stat,
  unit,
  rows,
}: {
  label: string;
  stat: string | number;
  unit: string;
  rows: [string, string | number][];
}) {
  return (
    <Card>
      <div className="label mb-4">{label}</div>
      <div className="flex items-baseline gap-2 mb-3">
        <span className="stat-sm">{stat}</span>
        <span className="text-[13px] text-muted-foreground">{unit}</span>
      </div>
      <dl className="rows">
        {rows.map(([name, value]) => (
          <div key={name}>
            <dt className="capitalize">{name}</dt>
            <dd>{value}</dd>
          </div>
        ))}
      </dl>
    </Card>
  );
}

function formatDuration(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
