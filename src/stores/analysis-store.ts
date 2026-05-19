import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { SongDNA, AnalysisProgress, SimilarityDimension } from '@/types/audio-features';

interface GraphFilters {
  dimension: SimilarityDimension | 'overall';
  threshold: number;
  showLabels: boolean;
}

interface AnalysisState {
  // Current analysis
  currentSong: SongDNA | null;
  isAnalyzing: boolean;
  analysisProgress: AnalysisProgress | null;

  // Library of analyzed songs
  songs: SongDNA[];

  // Selected song for detail view
  selectedSongId: string | null;

  // Visualization state
  activeVisualization: 'structure' | 'ingredients' | 'energy' | 'harmonic' | 'graph';

  // Graph filters
  graphFilters: GraphFilters;

  // Actions
  setCurrentSong: (song: SongDNA | null) => void;
  setIsAnalyzing: (isAnalyzing: boolean) => void;
  setAnalysisProgress: (progress: AnalysisProgress | null) => void;
  addSong: (song: SongDNA) => void;
  removeSong: (id: string) => void;
  selectSong: (id: string | null) => void;
  setActiveVisualization: (viz: AnalysisState['activeVisualization']) => void;
  setGraphFilter: (filters: Partial<GraphFilters>) => void;
  getSongById: (id: string) => SongDNA | undefined;
}

export const useAnalysisStore = create<AnalysisState>()(
  persist(
    (set, get) => ({
      // Initial state
      currentSong: null,
      isAnalyzing: false,
      analysisProgress: null,
      songs: [],
      selectedSongId: null,
      activeVisualization: 'structure',
      graphFilters: {
        dimension: 'overall',
        threshold: 0.5,
        showLabels: true,
      },

      // Actions
      setCurrentSong: (song) => set({ currentSong: song }),

      setIsAnalyzing: (isAnalyzing) => set({ isAnalyzing }),

      setAnalysisProgress: (progress) => set({ analysisProgress: progress }),

      addSong: (song) =>
        set((state) => ({
          songs: [...state.songs.filter((s) => s.id !== song.id), song],
          currentSong: song,
          selectedSongId: song.id,
        })),

      removeSong: (id) =>
        set((state) => ({
          songs: state.songs.filter((s) => s.id !== id),
          currentSong: state.currentSong?.id === id ? null : state.currentSong,
          selectedSongId: state.selectedSongId === id ? null : state.selectedSongId,
        })),

      selectSong: (id) => {
        const song = id ? get().songs.find((s) => s.id === id) : null;
        set({ selectedSongId: id, currentSong: song || null });
      },

      setActiveVisualization: (viz) => set({ activeVisualization: viz }),

      setGraphFilter: (filters) =>
        set((state) => ({
          graphFilters: { ...state.graphFilters, ...filters },
        })),

      getSongById: (id) => get().songs.find((s) => s.id === id),
    }),
    {
      name: 'musical-dna-storage',
      partialize: (state) => ({
        songs: state.songs,
        graphFilters: state.graphFilters,
      }),
    }
  )
);
