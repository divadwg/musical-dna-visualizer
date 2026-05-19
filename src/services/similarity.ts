import type { SongDNA, SimilarityScores, GraphData, GraphNode, GraphLink, SimilarityDimension } from '@/types/audio-features';

const PITCH_CLASSES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];

// Key colors for visualization
const KEY_COLORS: Record<string, string> = {
  C: '#FF6B6B',
  'C#': '#FF8E72',
  D: '#FFB347',
  'D#': '#FFD93D',
  E: '#6BCB77',
  F: '#4ECDC4',
  'F#': '#45B7D1',
  G: '#4D96FF',
  'G#': '#6C5CE7',
  A: '#A29BFE',
  'A#': '#D980FA',
  B: '#F368E0',
};

export function computeSimilarity(a: SongDNA, b: SongDNA): SimilarityScores {
  return {
    overall: cosineSimilarity(a.embedding, b.embedding),
    tonal: cosineSimilarity(a.embedding.slice(0, 24), b.embedding.slice(0, 24)),
    rhythm: cosineSimilarity(a.embedding.slice(24, 40), b.embedding.slice(24, 40)),
    timbre: cosineSimilarity(a.embedding.slice(40, 72), b.embedding.slice(40, 72)),
    dynamics: cosineSimilarity(a.embedding.slice(72, 88), b.embedding.slice(72, 88)),
    structure: cosineSimilarity(a.embedding.slice(88, 128), b.embedding.slice(88, 128)),
  };
}

function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length || a.length === 0) return 0;

  let dotProduct = 0;
  let normA = 0;
  let normB = 0;

  for (let i = 0; i < a.length; i++) {
    dotProduct += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }

  const denominator = Math.sqrt(normA) * Math.sqrt(normB);
  return denominator === 0 ? 0 : dotProduct / denominator;
}

export function computeGraphData(
  songs: SongDNA[],
  dimension: SimilarityDimension | 'overall' = 'overall',
  threshold: number = 0.3
): GraphData {
  if (songs.length === 0) {
    return { nodes: [], links: [] };
  }

  // Project embeddings to 3D using simple PCA-like approach
  const positions = projectTo3D(songs.map((s) => s.embedding));

  // Create nodes
  const nodes: GraphNode[] = songs.map((song, idx) => ({
    id: song.id,
    name: song.metadata.filename,
    x: positions[idx][0] * 100,
    y: positions[idx][1] * 100,
    z: positions[idx][2] * 100,
    color: KEY_COLORS[song.features.key.key] || '#888888',
    size: 5 + song.features.danceability! * 10,
    key: song.features.key.key,
    bpm: song.features.tempo.bpm,
  }));

  // Create links based on similarity
  const links: GraphLink[] = [];

  for (let i = 0; i < songs.length; i++) {
    for (let j = i + 1; j < songs.length; j++) {
      const similarity = computeSimilarity(songs[i], songs[j]);
      const score = dimension === 'overall' ? similarity.overall : similarity[dimension];

      if (score >= threshold) {
        // Find strongest dimension
        let strongestDim: SimilarityDimension = 'overall';
        let strongestScore = similarity.overall;

        for (const dim of ['tonal', 'rhythm', 'timbre', 'dynamics', 'structure'] as SimilarityDimension[]) {
          if (similarity[dim] > strongestScore) {
            strongestScore = similarity[dim];
            strongestDim = dim;
          }
        }

        links.push({
          source: songs[i].id,
          target: songs[j].id,
          similarity: score,
          dimension: strongestDim,
        });
      }
    }
  }

  return { nodes, links };
}

// Simple 3D projection using first 3 principal components approximation
function projectTo3D(embeddings: number[][]): number[][] {
  if (embeddings.length === 0) return [];
  if (embeddings.length === 1) return [[0, 0, 0]];

  const dim = embeddings[0].length;
  const n = embeddings.length;

  // Compute mean
  const mean = new Array(dim).fill(0);
  for (const emb of embeddings) {
    for (let i = 0; i < dim; i++) {
      mean[i] += emb[i] / n;
    }
  }

  // Center data
  const centered = embeddings.map((emb) => emb.map((v, i) => v - mean[i]));

  // Simple projection: use predefined directions that capture different aspects
  // X: first 24 dims (tonal)
  // Y: dims 24-40 (rhythm) + dims 72-88 (dynamics)
  // Z: dims 40-72 (timbre)

  return centered.map((emb) => {
    const x = sum(emb.slice(0, 24)) / 24;
    const y = (sum(emb.slice(24, 40)) + sum(emb.slice(72, 88))) / 32;
    const z = sum(emb.slice(40, 72)) / 32;
    return [x, y, z];
  });
}

function sum(arr: number[]): number {
  return arr.reduce((a, b) => a + b, 0);
}

// Dimension colors for link visualization
export const DIMENSION_COLORS: Record<SimilarityDimension | 'overall', string> = {
  overall: '#ffffff',
  tonal: '#FFD700',
  rhythm: '#FF6B6B',
  timbre: '#4ECDC4',
  dynamics: '#9B59B6',
  structure: '#3498DB',
};
