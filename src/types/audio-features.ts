// Core data model for Musical DNA Visualizer

export type SegmentLabel =
  | 'intro'
  | 'verse'
  | 'chorus'
  | 'bridge'
  | 'breakdown'
  | 'outro'
  | 'instrumental'
  | 'unknown';

export interface SongSegment {
  start: number; // seconds
  end: number;
  label: SegmentLabel;
  confidence: number;
  avgEnergy: number;
  dominantChord?: string;
}

export interface ChordSegment {
  start: number;
  end: number;
  chord: string; // "Cmaj", "Am", etc.
  confidence: number;
}

export interface SongMetadata {
  filename: string;
  duration: number; // seconds
  sampleRate: number;
  fileSize: number;
}

export interface KeyFeature {
  key: string; // "C", "D", etc.
  scale: 'major' | 'minor';
  strength: number; // 0-1 confidence
}

export interface TempoFeature {
  bpm: number;
  confidence: number;
  bpmHistogram?: number[];
}

export interface SpectralFeatures {
  centroidMean: number;
  centroidStd: number;
  contrastMean: number[]; // 6 bands
  flatnessMean: number;
  rolloffMean: number;
}

export interface LoudnessFeatures {
  integrated: number; // LUFS
  range: number; // LRA
  peak: number; // dBFS
}

export interface MoodFeatures {
  valence: number; // -1 to 1 (sad to happy)
  arousal: number; // -1 to 1 (calm to energetic)
}

export interface ExtractedFeatures {
  // Tonal
  key: KeyFeature;
  chords: ChordSegment[];
  tuningFrequency: number;

  // Rhythm
  tempo: TempoFeature;
  beats: number[]; // timestamps in seconds
  onsets: number[]; // attack points

  // Spectral/Timbre
  spectral: SpectralFeatures;
  mfccMean: number[]; // 13 coefficients averaged
  mfccStd: number[];

  // Energy/Dynamics
  loudness: LoudnessFeatures;
  energyCurve: number[]; // RMS energy per segment

  // High-Level (optional)
  mood?: MoodFeatures;
  danceability?: number;
  instrumentalness?: number;
}

export interface TimelineFeatures {
  frameRate: number; // frames per second (typically 10)
  chromagram: number[][]; // [frames][12 pitch classes]
  energyEnvelope: number[];
  spectralCentroid: number[];
  loudnessMomentary: number[];
  segments: SongSegment[];
}

export interface SongDNA {
  id: string;
  metadata: SongMetadata;
  features: ExtractedFeatures;
  timeline: TimelineFeatures;
  embedding: number[]; // 128-dimensional vector for similarity
  createdAt: number;
}

// For similarity calculations
export interface SimilarityScores {
  overall: number;
  tonal: number;
  rhythm: number;
  timbre: number;
  dynamics: number;
  structure: number;
}

export type SimilarityDimension = keyof SimilarityScores;

// Graph visualization types
export interface GraphNode {
  id: string;
  name: string;
  x: number;
  y: number;
  z: number;
  color: string;
  size: number;
  key: string;
  bpm: number;
}

export interface GraphLink {
  source: string;
  target: string;
  similarity: number;
  dimension: SimilarityDimension;
}

export interface GraphData {
  nodes: GraphNode[];
  links: GraphLink[];
}

// Analysis progress
export interface AnalysisProgress {
  stage: 'decoding' | 'extracting' | 'segmenting' | 'embedding' | 'complete';
  progress: number; // 0-1
  message: string;
}
