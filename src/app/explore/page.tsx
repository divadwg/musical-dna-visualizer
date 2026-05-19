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
          <div>
            <h1 className="text-2xl font-bold">3D Similarity Explorer</h1>
            <p className="text-muted-foreground">
              {songs.length} songs in your library
            </p>
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-[1fr_300px]">
          {/* 3D Graph */}
          <div className="space-y-4">
            <SimilarityGraph3D
              songs={songs}
              selectedSongId={selectedSongId}
              dimension={graphFilters.dimension}
              threshold={graphFilters.threshold}
              onSelectSong={selectSong}
            />

            {/* Controls */}
            <Card className="p-4">
              <div className="flex flex-wrap gap-6">
                {/* Dimension filter */}
                <div className="space-y-2">
                  <label className="text-sm font-medium">Similarity Dimension</label>
                  <Tabs
                    value={graphFilters.dimension}
                    onValueChange={handleDimensionChange}
                  >
                    <TabsList className="grid grid-cols-3 lg:grid-cols-6">
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
                <div className="space-y-2 flex-1 min-w-[200px]">
                  <label className="text-sm font-medium">
                    Similarity Threshold: {Math.round(graphFilters.threshold * 100)}%
                  </label>
                  <Slider
                    value={[graphFilters.threshold]}
                    onValueChange={handleThresholdChange}
                    min={0}
                    max={1}
                    step={0.05}
                    className="w-full"
                  />
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>Show more links</span>
                    <span>Show fewer links</span>
                  </div>
                </div>
              </div>
            </Card>
          </div>

          {/* Sidebar */}
          <div className="space-y-4">
            {/* Selected song details */}
            {selectedSong ? (
              <Card className="p-4">
                <h2 className="font-semibold mb-2">Selected Song</h2>
                <h3 className="font-medium truncate mb-2">{selectedSong.metadata.filename}</h3>
                <FeatureBadges song={selectedSong} size="sm" />

                <div className="mt-4 space-y-2">
                  <button
                    onClick={() => router.push(`/analyze/${selectedSong.id}`)}
                    className="w-full px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors text-sm"
                  >
                    View Full Analysis
                  </button>
                  <button
                    onClick={() => selectSong(null)}
                    className="w-full px-4 py-2 bg-muted text-muted-foreground rounded-lg hover:bg-muted/80 transition-colors text-sm"
                  >
                    Deselect
                  </button>
                </div>
              </Card>
            ) : (
              <Card className="p-4">
                <h2 className="font-semibold mb-2">Instructions</h2>
                <ul className="text-sm text-muted-foreground space-y-2">
                  <li>• Click a node to select a song</li>
                  <li>• Drag to rotate the view</li>
                  <li>• Scroll to zoom in/out</li>
                  <li>• Links show similarity between songs</li>
                  <li>• Node color = musical key</li>
                  <li>• Node size = energy level</li>
                </ul>
              </Card>
            )}

            {/* Song list */}
            <Card className="p-4">
              <h2 className="font-semibold mb-3">All Songs</h2>
              <div className="space-y-2 max-h-[400px] overflow-y-auto">
                {songs.map((song) => (
                  <button
                    key={song.id}
                    onClick={() => selectSong(song.id)}
                    className={`w-full text-left p-2 rounded-lg transition-colors text-sm ${
                      song.id === selectedSongId
                        ? 'bg-primary/20 border border-primary'
                        : 'hover:bg-muted'
                    }`}
                  >
                    <p className="font-medium truncate">{song.metadata.filename}</p>
                    <p className="text-xs text-muted-foreground">
                      {song.features.key.key} {song.features.key.scale} |{' '}
                      {Math.round(song.features.tempo.bpm)} BPM
                    </p>
                  </button>
                ))}
              </div>
            </Card>

            {/* Dimension explanation */}
            <Card className="p-4">
              <h2 className="font-semibold mb-3">Dimension Guide</h2>
              <div className="text-xs text-muted-foreground space-y-2">
                <p>
                  <strong className="text-foreground">Tonal:</strong> Key, chord progressions,
                  harmonic content
                </p>
                <p>
                  <strong className="text-foreground">Rhythm:</strong> Tempo, beat patterns,
                  groove
                </p>
                <p>
                  <strong className="text-foreground">Timbre:</strong> Sonic texture, brightness,
                  instrument qualities
                </p>
                <p>
                  <strong className="text-foreground">Energy:</strong> Loudness, dynamics,
                  intensity
                </p>
                <p>
                  <strong className="text-foreground">Structure:</strong> Song sections,
                  arrangement patterns
                </p>
              </div>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
