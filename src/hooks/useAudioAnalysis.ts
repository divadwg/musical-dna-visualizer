'use client';

import { useCallback, useState } from 'react';
import { useAnalysisStore } from '@/stores/analysis-store';
import { usePlaybackStore } from '@/stores/playback-store';
import { getAudioExtractor } from '@/services/audio/feature-extractor';
import { saveSong, saveAudioBlob } from '@/db';
import type { AnalysisProgress, SongDNA } from '@/types/audio-features';

export function useAudioAnalysis() {
  const [error, setError] = useState<string | null>(null);

  const { isAnalyzing, analysisProgress, setIsAnalyzing, setAnalysisProgress, addSong } =
    useAnalysisStore();

  const { setAudioBuffer } = usePlaybackStore();

  const analyzeFile = useCallback(
    async (file: File): Promise<SongDNA | null> => {
      setError(null);
      setIsAnalyzing(true);

      try {
        const extractor = getAudioExtractor();

        const onProgress = (progress: AnalysisProgress) => {
          setAnalysisProgress(progress);
        };

        // Analyze the audio
        const songDNA = await extractor.analyze(file, onProgress);

        // Save to IndexedDB
        await saveSong(songDNA);
        await saveAudioBlob(songDNA.id, file);

        // Add to store
        addSong(songDNA);

        // Decode audio for playback
        const audioContext = new AudioContext();
        const arrayBuffer = await file.arrayBuffer();
        const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
        setAudioBuffer(audioBuffer);
        audioContext.close();

        setIsAnalyzing(false);
        setAnalysisProgress(null);

        return songDNA;
      } catch (err) {
        console.error('Analysis failed:', err);
        setError(err instanceof Error ? err.message : 'Analysis failed');
        setIsAnalyzing(false);
        setAnalysisProgress(null);
        return null;
      }
    },
    [setIsAnalyzing, setAnalysisProgress, addSong, setAudioBuffer]
  );

  return {
    analyzeFile,
    isAnalyzing,
    analysisProgress,
    error,
  };
}
