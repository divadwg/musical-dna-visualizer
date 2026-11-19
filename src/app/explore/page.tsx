'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAnalysisStore } from '@/stores/analysis-store';
import { Card } from '@/components/ui/card';
import { Slider } from '@/components/ui/slider';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { FeatureBadges } from '@/components/common/FeatureBadges';
import { SimilarityGraph3D } from '@/components/visualizations/SimilarityGraph3D';
import type { SimilarityDimension } from '@/types/audio-features';

export default function ExplorePage() {
  const router = useRouter();
  const { songs, selectedSongId, selectSong, graphFilters, setGraphFilter } = useAnalysisStore();

  const selectedSong = songs.find((s) => s.id === selectedSongId);

  const handleDimensionChange = (value: string) => {
    setGraphFilter({ dimension: value as SimilarityDimension | 'overall' });
  };

  const handleThresholdChange = (value: number[]) => {
    setGraphFilter({ threshold: value[0] });
  };

  return (
    <div>
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
        <div>
          <div className="label mb-2 mt-1">
            {songs.length} {songs.length === 1 ? 'song' : 'songs'} in your library
          </div>
          <h1 className="!text-[28px]">3D similarity explorer</h1>
        </div>
      </div>

      <div className="grid gap-3 lg:grid-cols-[1fr_300px]">
        {/* 3D Graph */}
        <div className="space-y-3 min-w-0">
          <SimilarityGraph3D
            songs={songs}
            selectedSongId={selectedSongId}
            dimension={graphFilters.dimension}
            threshold={graphFilters.threshold}
            onSelectSong={selectSong}
          />

          {/* Controls */}
          <Card>
            <div className="flex flex-wrap gap-x-8 gap-y-5">
              {/* Dimension filter */}
              <div className="min-w-0">
                <div className="label mb-3">Similarity dimension</div>
                <Tabs value={graphFilters.dimension} onValueChange={handleDimensionChange}>
                  <TabsList>
                    <TabsTrigger value="overall">Overall</TabsTrigger>
                    <TabsTrigger value="tonal">Tonal</TabsTrigger>
                    <TabsTrigger value="rhythm">Rhythm</TabsTrigger>
                    <TabsTrigger value="timbre">Timbre</TabsTrigger>
                    <TabsTrigger value="dynamics">Energy</TabsTrigger>
                    <TabsTrigger value="structure">Structure</TabsTrigger>
                  </TabsList>
                </Tabs>
              </div>

              {/* Threshold slider */}
              <div className="flex-1 min-w-[200px]">
                <div className="flex items-baseline justify-between mb-3">
                  <span className="label">Similarity threshold</span>
                  <span className="mono text-ink">{Math.round(graphFilters.threshold * 100)}%</span>
                </div>
                <Slider
                  value={[graphFilters.threshold]}
                  onValueChange={handleThresholdChange}
                  min={0}
                  max={1}
                  step={0.05}
                  className="w-full py-2"
                  aria-label="Similarity threshold"
                />
                <div className="flex justify-between mt-2">
                  <span className="label !text-[9px]">More links</span>
                  <span className="label !text-[9px]">Fewer links</span>
                </div>
              </div>
            </div>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-3 min-w-0">
          {/* Selected song details */}
          {selectedSong ? (
            <Card>
              <div className="flex items-center justify-between mb-3">
                <span className="label">Selected song</span>
                <span className="status ok">Selected</span>
              </div>
              <h2 className="truncate mb-2.5">{selectedSong.metadata.filename}</h2>
              <FeatureBadges song={selectedSong} size="sm" />

              <div className="mt-4 flex flex-col gap-2">
                <button
                  onClick={() => router.push(`/analyze/${selectedSong.id}`)}
                  className="btn-primary key w-full"
                >
                  View full analysis
                </button>
                <button onClick={() => selectSong(null)} className="btn w-full">
                  Deselect
                </button>
              </div>
            </Card>
          ) : (
            <Card>
              <div className="label mb-1">How to use</div>
              <dl className="rows">
                <div><dt>Click a node</dt><dd>select</dd></div>
                <div><dt>Drag</dt><dd>rotate</dd></div>
                <div><dt>Scroll</dt><dd>zoom</dd></div>
                <div><dt>Link</dt><dd>similar pair</dd></div>
                <div><dt>Node size</dt><dd>energy</dd></div>
              </dl>
            </Card>
          )}

          {/* Song list */}
          <Card>
            <div className="flex items-baseline justify-between mb-2">
              <span className="label">All songs</span>
              <span className="label">{songs.length}</span>
            </div>
            <div className="-mx-1.5 space-y-0.5 max-h-[400px] overflow-y-auto p-1.5">
              {songs.map((song) => (
                <button
                  key={song.id}
                  onClick={() => selectSong(song.id)}
                  aria-current={song.id === selectedSongId ? 'true' : undefined}
                  className="nav-row"
                >
                  <span className="font-medium text-ink truncate w-full">{song.metadata.filename}</span>
                  <span className="mono text-[11px] text-muted-foreground">
                    {song.features.key.key} {song.features.key.scale} ·{' '}
                    {Math.round(song.features.tempo.bpm)} BPM
                  </span>
                </button>
              ))}
            </div>
          </Card>

          {/* Dimension explanation */}
          <Card>
            <div className="label mb-3">Dimension guide</div>
            <div className="text-[12px] space-y-2.5">
              <p>
                <span className="text-ink font-medium">Tonal.</span> Key, chord progressions,
                harmonic content
              </p>
              <p>
                <span className="text-ink font-medium">Rhythm.</span> Tempo, beat patterns, groove
              </p>
              <p>
                <span className="text-ink font-medium">Timbre.</span> Sonic texture, brightness,
                instrument qualities
              </p>
              <p>
                <span className="text-ink font-medium">Energy.</span> Loudness, dynamics, intensity
              </p>
              <p>
                <span className="text-ink font-medium">Structure.</span> Song sections, arrangement
                patterns
              </p>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
