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
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-muted-foreground">Loading...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/20">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <button
            onClick={() => router.push('/')}
            className="p-2 hover:bg-muted rounded-lg transition-colors"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <div className="flex-1">
            <h1 className="text-2xl font-bold">{song.metadata.filename}</h1>
            <FeatureBadges song={song} />
          </div>
          <PlaybackControls />
        </div>

        {/* Waveform */}
        <Card className="p-4 mb-8">
          <WaveformDisplay
            segments={song.timeline.segments}
            beats={song.features.beats.slice(0, 200)}
          />
        </Card>

        {/* Visualization Tabs */}
        <Tabs defaultValue="structure" className="space-y-4">
          <TabsList className="grid w-full grid-cols-4 lg:w-auto lg:inline-flex">
            <TabsTrigger value="structure">Structure</TabsTrigger>
            <TabsTrigger value="energy">Energy Arc</TabsTrigger>
            <TabsTrigger value="harmonic">Harmonic DNA</TabsTrigger>
            <TabsTrigger value="details">Details</TabsTrigger>
          </TabsList>

          <TabsContent value="structure">
            <Card className="p-6">
              <h2 className="text-xl font-semibold mb-4">Song Structure</h2>
              <p className="text-muted-foreground mb-4">
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
            <Card className="p-6">
              <h2 className="text-xl font-semibold mb-4">Energy Arc</h2>
              <p className="text-muted-foreground mb-4">
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
            <Card className="p-6">
              <h2 className="text-xl font-semibold mb-4">Harmonic DNA</h2>
              <p className="text-muted-foreground mb-4">
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
            <Card className="p-6">
              <h2 className="text-xl font-semibold mb-4">Technical Details</h2>
              <div className="grid gap-6 md:grid-cols-2">
                {/* Tempo & Rhythm */}
                <div className="space-y-2">
                  <h3 className="font-medium">Tempo & Rhythm</h3>
                  <div className="text-sm space-y-1">
                    <p>
                      <span className="text-muted-foreground">BPM:</span>{' '}
                      {Math.round(song.features.tempo.bpm)}
                    </p>
                    <p>
                      <span className="text-muted-foreground">Confidence:</span>{' '}
                      {Math.round(song.features.tempo.confidence * 100)}%
                    </p>
                    <p>
                      <span className="text-muted-foreground">Beat Count:</span>{' '}
                      {song.features.beats.length}
                    </p>
                  </div>
                </div>

                {/* Key & Harmony */}
                <div className="space-y-2">
                  <h3 className="font-medium">Key & Harmony</h3>
                  <div className="text-sm space-y-1">
                    <p>
                      <span className="text-muted-foreground">Key:</span>{' '}
                      {song.features.key.key} {song.features.key.scale}
                    </p>
                    <p>
                      <span className="text-muted-foreground">Confidence:</span>{' '}
                      {Math.round(song.features.key.strength * 100)}%
                    </p>
                    <p>
                      <span className="text-muted-foreground">Chord Changes:</span>{' '}
                      {song.features.chords.length}
                    </p>
                  </div>
                </div>

                {/* Loudness */}
                <div className="space-y-2">
                  <h3 className="font-medium">Loudness</h3>
                  <div className="text-sm space-y-1">
                    <p>
                      <span className="text-muted-foreground">Integrated:</span>{' '}
                      {song.features.loudness.integrated.toFixed(1)} dB
                    </p>
                    <p>
                      <span className="text-muted-foreground">Peak:</span>{' '}
                      {song.features.loudness.peak.toFixed(1)} dB
                    </p>
                    <p>
                      <span className="text-muted-foreground">Range:</span>{' '}
                      {song.features.loudness.range.toFixed(1)} LU
                    </p>
                  </div>
                </div>

                {/* Spectral */}
                <div className="space-y-2">
                  <h3 className="font-medium">Spectral Features</h3>
                  <div className="text-sm space-y-1">
                    <p>
                      <span className="text-muted-foreground">Brightness:</span>{' '}
                      {song.features.spectral.centroidMean.toFixed(0)} Hz
                    </p>
                    <p>
                      <span className="text-muted-foreground">Flatness:</span>{' '}
                      {(song.features.spectral.flatnessMean * 100).toFixed(1)}%
                    </p>
                    <p>
                      <span className="text-muted-foreground">Rolloff:</span>{' '}
                      {song.features.spectral.rolloffMean.toFixed(0)} Hz
                    </p>
                  </div>
                </div>

                {/* Metadata */}
                <div className="space-y-2">
                  <h3 className="font-medium">File Info</h3>
                  <div className="text-sm space-y-1">
                    <p>
                      <span className="text-muted-foreground">Duration:</span>{' '}
                      {formatDuration(song.metadata.duration)}
                    </p>
                    <p>
                      <span className="text-muted-foreground">Sample Rate:</span>{' '}
                      {song.metadata.sampleRate} Hz
                    </p>
                    <p>
                      <span className="text-muted-foreground">File Size:</span>{' '}
                      {formatFileSize(song.metadata.fileSize)}
                    </p>
                  </div>
                </div>

                {/* Segments */}
                <div className="space-y-2">
                  <h3 className="font-medium">Structure Summary</h3>
                  <div className="text-sm space-y-1">
                    {Object.entries(
                      song.timeline.segments.reduce(
                        (acc, seg) => {
                          acc[seg.label] = (acc[seg.label] || 0) + 1;
                          return acc;
                        },
                        {} as Record<string, number>
                      )
                    ).map(([label, count]) => (
                      <p key={label}>
                        <span className="text-muted-foreground capitalize">{label}:</span> {count}
                      </p>
                    ))}
                  </div>
                </div>
              </div>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Navigation to other songs */}
        {songs.length > 1 && (
          <div className="mt-8">
            <h2 className="text-xl font-semibold mb-4">Other Songs</h2>
            <div className="grid gap-4 md:grid-cols-3">
              {songs
                .filter((s) => s.id !== id)
                .slice(0, 3)
                .map((s) => (
                  <Card
                    key={s.id}
                    className="p-4 cursor-pointer hover:bg-muted/50 transition-colors"
                    onClick={() => router.push(`/analyze/${s.id}`)}
                  >
                    <h3 className="font-medium mb-2 truncate">{s.metadata.filename}</h3>
                    <FeatureBadges song={s} size="sm" />
                  </Card>
                ))}
            </div>
          </div>
        )}
      </div>
    </div>
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
