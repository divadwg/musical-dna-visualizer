import { v4 as uuidv4 } from 'uuid';
import type {
  SongDNA,
  SongMetadata,
  ExtractedFeatures,
  TimelineFeatures,
  KeyFeature,
  TempoFeature,
  SpectralFeatures,
  LoudnessFeatures,
  SongSegment,
  ChordSegment,
  AnalysisProgress,
} from '@/types/audio-features';

type ProgressCallback = (progress: AnalysisProgress) => void;

// Pitch class names
const PITCH_CLASSES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];

export class AudioFeatureExtractor {
  private audioContext: AudioContext | null = null;

  async analyze(file: File, onProgress: ProgressCallback): Promise<SongDNA> {
    const id = uuidv4();

    // Stage 1: Decode audio
    onProgress({ stage: 'decoding', progress: 0.05, message: 'Decoding audio file...' });
    const audioBuffer = await this.decodeFile(file);

    const metadata: SongMetadata = {
      filename: file.name,
      duration: audioBuffer.duration,
      sampleRate: audioBuffer.sampleRate,
      fileSize: file.size,
    };

    onProgress({ stage: 'decoding', progress: 0.1, message: 'Audio decoded successfully' });

    // Get mono signal
    const signal = this.getMonoSignal(audioBuffer);

    // Stage 2: Extract features
    onProgress({ stage: 'extracting', progress: 0.15, message: 'Extracting tempo and beats...' });
    await this.yield();
    const tempo = this.extractTempo(signal, audioBuffer.sampleRate);
    const beats = this.extractBeats(signal, audioBuffer.sampleRate, tempo.bpm);

    onProgress({ stage: 'extracting', progress: 0.25, message: 'Analyzing pitch and key...' });
    await this.yield();
    const { chromagram, key } = this.extractPitchFeatures(signal, audioBuffer.sampleRate);

    onProgress({ stage: 'extracting', progress: 0.35, message: 'Computing spectral features...' });
    await this.yield();
    const spectral = this.extractSpectralFeatures(signal, audioBuffer.sampleRate);
    const mfcc = this.extractMFCC(signal, audioBuffer.sampleRate);

    onProgress({ stage: 'extracting', progress: 0.45, message: 'Analyzing energy and loudness...' });
    await this.yield();
    const energyCurve = this.extractEnergyCurve(signal, audioBuffer.sampleRate);
    const loudness = this.extractLoudness(signal);

    onProgress({ stage: 'extracting', progress: 0.55, message: 'Detecting chords...' });
    await this.yield();
    const chords = this.detectChords(chromagram, audioBuffer.duration);

    // Stage 3: Segment detection
    onProgress({ stage: 'segmenting', progress: 0.65, message: 'Detecting song structure...' });
    await this.yield();
    const segments = this.detectSegments(chromagram, energyCurve, beats, audioBuffer.duration);

    onProgress({ stage: 'segmenting', progress: 0.75, message: 'Refining segment labels...' });

    // Stage 4: Compute embedding
    onProgress({ stage: 'embedding', progress: 0.85, message: 'Computing similarity embedding...' });
    await this.yield();

    const features: ExtractedFeatures = {
      key,
      chords,
      tuningFrequency: 440,
      tempo,
      beats,
      onsets: beats, // Simplified: using beats as onsets
      spectral,
      mfccMean: mfcc.mean,
      mfccStd: mfcc.std,
      loudness,
      energyCurve: this.downsample(energyCurve, 100), // Downsample for storage
      danceability: this.computeDanceability(tempo, beats, energyCurve),
    };

    const timeline: TimelineFeatures = {
      frameRate: 10,
      chromagram,
      energyEnvelope: energyCurve,
      spectralCentroid: this.extractSpectralCentroidTimeline(signal, audioBuffer.sampleRate),
      loudnessMomentary: energyCurve, // Simplified
      segments,
    };

    const embedding = this.computeEmbedding(features, timeline);

    onProgress({ stage: 'complete', progress: 1, message: 'Analysis complete!' });

    return {
      id,
      metadata,
      features,
      timeline,
      embedding,
      createdAt: Date.now(),
    };
  }

  private async decodeFile(file: File): Promise<AudioBuffer> {
    if (!this.audioContext) {
      this.audioContext = new AudioContext();
    }

    const arrayBuffer = await file.arrayBuffer();
    return this.audioContext.decodeAudioData(arrayBuffer);
  }

  private getMonoSignal(buffer: AudioBuffer): Float32Array {
    if (buffer.numberOfChannels === 1) {
      return buffer.getChannelData(0);
    }

    // Mix to mono
    const left = buffer.getChannelData(0);
    const right = buffer.getChannelData(1);
    const mono = new Float32Array(left.length);

    for (let i = 0; i < left.length; i++) {
      mono[i] = (left[i] + right[i]) / 2;
    }

    return mono;
  }

  private extractTempo(signal: Float32Array, sampleRate: number): TempoFeature {
    // Simplified tempo detection using autocorrelation
    const frameSize = 2048;
    const hopSize = 512;
    const energyFrames: number[] = [];

    // Compute energy per frame
    for (let i = 0; i < signal.length - frameSize; i += hopSize) {
      let energy = 0;
      for (let j = 0; j < frameSize; j++) {
        energy += signal[i + j] * signal[i + j];
      }
      energyFrames.push(Math.sqrt(energy / frameSize));
    }

    // Compute onset strength (difference in energy)
    const onsetStrength: number[] = [];
    for (let i = 1; i < energyFrames.length; i++) {
      onsetStrength.push(Math.max(0, energyFrames[i] - energyFrames[i - 1]));
    }

    // Autocorrelation to find periodicity
    const minLag = Math.floor((60 / 200) * (sampleRate / hopSize)); // 200 BPM
    const maxLag = Math.floor((60 / 60) * (sampleRate / hopSize)); // 60 BPM

    let bestLag = minLag;
    let bestCorr = 0;

    for (let lag = minLag; lag < maxLag && lag < onsetStrength.length / 2; lag++) {
      let corr = 0;
      let count = 0;
      for (let i = 0; i < onsetStrength.length - lag; i++) {
        corr += onsetStrength[i] * onsetStrength[i + lag];
        count++;
      }
      corr /= count;

      if (corr > bestCorr) {
        bestCorr = corr;
        bestLag = lag;
      }
    }

    const bpm = (60 * sampleRate) / (hopSize * bestLag);
    const clampedBpm = Math.max(60, Math.min(200, bpm));

    return {
      bpm: Math.round(clampedBpm),
      confidence: Math.min(1, bestCorr * 10),
    };
  }

  private extractBeats(signal: Float32Array, sampleRate: number, bpm: number): number[] {
    const beatInterval = 60 / bpm;
    const beats: number[] = [];
    const duration = signal.length / sampleRate;

    // Simple beat grid based on detected tempo
    // In a real implementation, we'd use beat tracking algorithms
    for (let t = 0; t < duration; t += beatInterval) {
      beats.push(t);
    }

    return beats;
  }

  private extractPitchFeatures(
    signal: Float32Array,
    sampleRate: number
  ): { chromagram: number[][]; key: KeyFeature } {
    const frameSize = 4096;
    const hopSize = Math.floor(sampleRate / 10); // 10 frames per second
    const chromagram: number[][] = [];

    // Compute chromagram using simplified pitch class detection
    for (let i = 0; i < signal.length - frameSize; i += hopSize) {
      const frame = signal.slice(i, i + frameSize);
      const chroma = this.computeChroma(frame, sampleRate);
      chromagram.push(chroma);
    }

    // Compute average chroma for key detection
    const avgChroma = new Array(12).fill(0);
    for (const frame of chromagram) {
      for (let i = 0; i < 12; i++) {
        avgChroma[i] += frame[i];
      }
    }
    for (let i = 0; i < 12; i++) {
      avgChroma[i] /= chromagram.length;
    }

    // Detect key using Krumhansl-Schmuckler key profiles
    const key = this.detectKey(avgChroma);

    return { chromagram, key };
  }

  private computeChroma(frame: Float32Array, sampleRate: number): number[] {
    // Simplified chroma computation using FFT
    const fft = this.computeFFT(frame);
    const chroma = new Array(12).fill(0);

    for (let bin = 1; bin < fft.length / 2; bin++) {
      const freq = (bin * sampleRate) / fft.length;
      if (freq < 50 || freq > 5000) continue;

      // Convert frequency to pitch class
      const midiNote = 12 * Math.log2(freq / 440) + 69;
      const pitchClass = Math.round(midiNote) % 12;
      if (pitchClass >= 0 && pitchClass < 12) {
        chroma[pitchClass] += fft[bin];
      }
    }

    // Normalize
    const max = Math.max(...chroma);
    if (max > 0) {
      for (let i = 0; i < 12; i++) {
        chroma[i] /= max;
      }
    }

    return chroma;
  }

  private computeFFT(signal: Float32Array): Float32Array {
    // Pad to next power of 2 for iterative radix-2 Cooley-Tukey
    const n = signal.length;
    let size = 1;
    while (size < n) size <<= 1;

    const real = new Float32Array(size);
    const imag = new Float32Array(size);
    for (let i = 0; i < n; i++) real[i] = signal[i];

    // Bit-reversal permutation
    for (let i = 1, j = 0; i < size; i++) {
      let bit = size >> 1;
      for (; j & bit; bit >>= 1) j ^= bit;
      j ^= bit;
      if (i < j) {
        const tr = real[i];
        real[i] = real[j];
        real[j] = tr;
        const ti = imag[i];
        imag[i] = imag[j];
        imag[j] = ti;
      }
    }

    // Butterflies
    for (let len = 2; len <= size; len <<= 1) {
      const halfLen = len >> 1;
      const angle = (-2 * Math.PI) / len;
      const wStepR = Math.cos(angle);
      const wStepI = Math.sin(angle);
      for (let i = 0; i < size; i += len) {
        let wR = 1;
        let wI = 0;
        for (let k = 0; k < halfLen; k++) {
          const idxA = i + k;
          const idxB = i + k + halfLen;
          const tR = wR * real[idxB] - wI * imag[idxB];
          const tI = wR * imag[idxB] + wI * real[idxB];
          real[idxB] = real[idxA] - tR;
          imag[idxB] = imag[idxA] - tI;
          real[idxA] += tR;
          imag[idxA] += tI;
          const nwR = wR * wStepR - wI * wStepI;
          wI = wR * wStepI + wI * wStepR;
          wR = nwR;
        }
      }
    }

    const output = new Float32Array(size);
    for (let i = 0; i < size; i++) {
      output[i] = Math.sqrt(real[i] * real[i] + imag[i] * imag[i]);
    }
    return output;
  }

  private yield(): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, 0));
  }

  private detectKey(avgChroma: number[]): KeyFeature {
    // Krumhansl-Schmuckler key profiles (simplified)
    const majorProfile = [6.35, 2.23, 3.48, 2.33, 4.38, 4.09, 2.52, 5.19, 2.39, 3.66, 2.29, 2.88];
    const minorProfile = [6.33, 2.68, 3.52, 5.38, 2.6, 3.53, 2.54, 4.75, 3.98, 2.69, 3.34, 3.17];

    let bestKey = 0;
    let bestScale: 'major' | 'minor' = 'major';
    let bestCorr = -Infinity;

    for (let key = 0; key < 12; key++) {
      // Rotate chroma to test each key
      const rotatedChroma = [...avgChroma.slice(key), ...avgChroma.slice(0, key)];

      // Test major
      const majorCorr = this.correlation(rotatedChroma, majorProfile);
      if (majorCorr > bestCorr) {
        bestCorr = majorCorr;
        bestKey = key;
        bestScale = 'major';
      }

      // Test minor
      const minorCorr = this.correlation(rotatedChroma, minorProfile);
      if (minorCorr > bestCorr) {
        bestCorr = minorCorr;
        bestKey = key;
        bestScale = 'minor';
      }
    }

    return {
      key: PITCH_CLASSES[bestKey],
      scale: bestScale,
      strength: Math.max(0, Math.min(1, (bestCorr + 1) / 2)),
    };
  }

  private correlation(a: number[], b: number[]): number {
    const n = Math.min(a.length, b.length);
    let sumA = 0,
      sumB = 0,
      sumAB = 0,
      sumA2 = 0,
      sumB2 = 0;

    for (let i = 0; i < n; i++) {
      sumA += a[i];
      sumB += b[i];
      sumAB += a[i] * b[i];
      sumA2 += a[i] * a[i];
      sumB2 += b[i] * b[i];
    }

    const num = n * sumAB - sumA * sumB;
    const den = Math.sqrt((n * sumA2 - sumA * sumA) * (n * sumB2 - sumB * sumB));

    return den === 0 ? 0 : num / den;
  }

  private extractSpectralFeatures(signal: Float32Array, sampleRate: number): SpectralFeatures {
    const frameSize = 2048;
    const hopSize = 1024;
    const centroids: number[] = [];
    const flatness: number[] = [];
    const rolloffs: number[] = [];

    for (let i = 0; i < signal.length - frameSize; i += hopSize) {
      const frame = signal.slice(i, i + frameSize);
      const fft = this.computeFFT(frame);

      // Spectral centroid
      let weightedSum = 0;
      let totalMag = 0;
      for (let bin = 0; bin < fft.length / 2; bin++) {
        const freq = (bin * sampleRate) / fft.length;
        weightedSum += freq * fft[bin];
        totalMag += fft[bin];
      }
      centroids.push(totalMag > 0 ? weightedSum / totalMag : 0);

      // Spectral flatness (geometric mean / arithmetic mean)
      const magnitudes = Array.from(fft.slice(0, fft.length / 2)).filter((m) => m > 0);
      if (magnitudes.length > 0) {
        const geoMean = Math.exp(magnitudes.reduce((sum, m) => sum + Math.log(m), 0) / magnitudes.length);
        const ariMean = magnitudes.reduce((sum, m) => sum + m, 0) / magnitudes.length;
        flatness.push(ariMean > 0 ? geoMean / ariMean : 0);
      } else {
        flatness.push(0);
      }

      // Spectral rolloff (frequency below which 85% of energy is contained)
      let cumSum = 0;
      const threshold = totalMag * 0.85;
      let rolloffBin = 0;
      for (let bin = 0; bin < fft.length / 2; bin++) {
        cumSum += fft[bin];
        if (cumSum >= threshold) {
          rolloffBin = bin;
          break;
        }
      }
      rolloffs.push((rolloffBin * sampleRate) / fft.length);
    }

    return {
      centroidMean: this.mean(centroids),
      centroidStd: this.std(centroids),
      contrastMean: [0, 0, 0, 0, 0, 0], // Simplified
      flatnessMean: this.mean(flatness),
      rolloffMean: this.mean(rolloffs),
    };
  }

  private extractMFCC(
    signal: Float32Array,
    _sampleRate: number
  ): { mean: number[]; std: number[] } {
    // Simplified MFCC - in production use a proper implementation
    // Return placeholder values
    return {
      mean: new Array(13).fill(0).map((_, i) => Math.sin(i) * 10),
      std: new Array(13).fill(1),
    };
  }

  private extractEnergyCurve(signal: Float32Array, sampleRate: number): number[] {
    const frameSize = Math.floor(sampleRate / 10); // 10 frames per second
    const energy: number[] = [];

    for (let i = 0; i < signal.length; i += frameSize) {
      const end = Math.min(i + frameSize, signal.length);
      let sum = 0;
      for (let j = i; j < end; j++) {
        sum += signal[j] * signal[j];
      }
      energy.push(Math.sqrt(sum / (end - i)));
    }

    // Normalize to 0-1
    const max = Math.max(...energy);
    if (max > 0) {
      for (let i = 0; i < energy.length; i++) {
        energy[i] /= max;
      }
    }

    return energy;
  }

  private extractSpectralCentroidTimeline(signal: Float32Array, sampleRate: number): number[] {
    const frameSize = Math.floor(sampleRate / 10);
    const centroids: number[] = [];

    for (let i = 0; i < signal.length; i += frameSize) {
      const frame = signal.slice(i, Math.min(i + frameSize, signal.length));
      const fft = this.computeFFT(frame);

      let weightedSum = 0;
      let totalMag = 0;
      for (let bin = 0; bin < fft.length / 2; bin++) {
        const freq = (bin * sampleRate) / fft.length;
        weightedSum += freq * fft[bin];
        totalMag += fft[bin];
      }
      centroids.push(totalMag > 0 ? weightedSum / totalMag : 0);
    }

    return centroids;
  }

  private extractLoudness(signal: Float32Array): LoudnessFeatures {
    // Compute RMS loudness
    let sum = 0;
    let peak = 0;

    for (let i = 0; i < signal.length; i++) {
      sum += signal[i] * signal[i];
      peak = Math.max(peak, Math.abs(signal[i]));
    }

    const rms = Math.sqrt(sum / signal.length);

    return {
      integrated: 20 * Math.log10(rms + 1e-10), // dB
      range: 10, // Placeholder
      peak: 20 * Math.log10(peak + 1e-10),
    };
  }

  private detectChords(chromagram: number[][], duration: number): ChordSegment[] {
    const chords: ChordSegment[] = [];
    const framesPerSecond = chromagram.length / duration;

    // Simple chord detection - find dominant pitch class in each segment
    const segmentSize = Math.max(1, Math.floor(framesPerSecond * 2)); // 2-second segments

    for (let i = 0; i < chromagram.length; i += segmentSize) {
      const segmentEnd = Math.min(i + segmentSize, chromagram.length);
      const avgChroma = new Array(12).fill(0);

      for (let j = i; j < segmentEnd; j++) {
        for (let k = 0; k < 12; k++) {
          avgChroma[k] += chromagram[j][k];
        }
      }

      // Find root note
      let maxIdx = 0;
      let maxVal = avgChroma[0];
      for (let k = 1; k < 12; k++) {
        if (avgChroma[k] > maxVal) {
          maxVal = avgChroma[k];
          maxIdx = k;
        }
      }

      // Simple major/minor detection
      const third = avgChroma[(maxIdx + 4) % 12];
      const minorThird = avgChroma[(maxIdx + 3) % 12];
      const isMinor = minorThird > third;

      chords.push({
        start: (i / chromagram.length) * duration,
        end: (segmentEnd / chromagram.length) * duration,
        chord: `${PITCH_CLASSES[maxIdx]}${isMinor ? 'm' : ''}`,
        confidence: maxVal / (avgChroma.reduce((a, b) => a + b, 0) + 1e-10),
      });
    }

    return chords;
  }

  private detectSegments(
    chromagram: number[][],
    energyCurve: number[],
    beats: number[],
    duration: number
  ): SongSegment[] {
    // Simplified segment detection using energy and novelty
    const segments: SongSegment[] = [];

    // Compute novelty function from chromagram
    const novelty: number[] = [0];
    for (let i = 1; i < chromagram.length; i++) {
      let diff = 0;
      for (let j = 0; j < 12; j++) {
        diff += Math.abs(chromagram[i][j] - chromagram[i - 1][j]);
      }
      novelty.push(diff);
    }

    // Find peaks in novelty (segment boundaries)
    const threshold = this.mean(novelty) + this.std(novelty);
    const boundaries: number[] = [0];

    // Minimum segment length: 5 seconds
    const minSegmentFrames = Math.floor((5 * chromagram.length) / duration);

    for (let i = 1; i < novelty.length - 1; i++) {
      if (
        novelty[i] > threshold &&
        novelty[i] > novelty[i - 1] &&
        novelty[i] > novelty[i + 1] &&
        i - boundaries[boundaries.length - 1] > minSegmentFrames
      ) {
        boundaries.push(i);
      }
    }
    boundaries.push(chromagram.length);

    // Label segments based on position and energy
    const avgEnergy = this.mean(energyCurve);

    for (let i = 0; i < boundaries.length - 1; i++) {
      const start = (boundaries[i] / chromagram.length) * duration;
      const end = (boundaries[i + 1] / chromagram.length) * duration;

      // Get average energy for this segment
      const startIdx = Math.floor((boundaries[i] / chromagram.length) * energyCurve.length);
      const endIdx = Math.floor((boundaries[i + 1] / chromagram.length) * energyCurve.length);
      const segmentEnergy = this.mean(energyCurve.slice(startIdx, endIdx));

      // Simple labeling heuristics
      let label: SongSegment['label'] = 'unknown';

      if (i === 0 && segmentEnergy < avgEnergy * 0.7) {
        label = 'intro';
      } else if (i === boundaries.length - 2 && segmentEnergy < avgEnergy * 0.8) {
        label = 'outro';
      } else if (segmentEnergy > avgEnergy * 1.1) {
        label = 'chorus';
      } else if (segmentEnergy < avgEnergy * 0.6) {
        label = 'breakdown';
      } else {
        label = 'verse';
      }

      segments.push({
        start,
        end,
        label,
        confidence: 0.7,
        avgEnergy: segmentEnergy,
      });
    }

    return segments;
  }

  private computeDanceability(tempo: TempoFeature, beats: number[], energyCurve: number[]): number {
    // Simple danceability based on tempo and energy consistency
    const tempoScore = tempo.bpm >= 100 && tempo.bpm <= 130 ? 1 : 0.5;
    const energyScore = this.mean(energyCurve);
    const consistencyScore = 1 - this.std(energyCurve);

    return Math.min(1, (tempoScore + energyScore + consistencyScore) / 3);
  }

  private computeEmbedding(features: ExtractedFeatures, timeline: TimelineFeatures): number[] {
    // Create 128-dimensional embedding from features
    const embedding: number[] = [];

    // Tonal: 24 dims (average chroma + key one-hot)
    const avgChroma = new Array(12).fill(0);
    for (const frame of timeline.chromagram) {
      for (let i = 0; i < 12; i++) {
        avgChroma[i] += frame[i];
      }
    }
    const chromaSum = avgChroma.reduce((a, b) => a + b, 0) || 1;
    embedding.push(...avgChroma.map((c) => c / chromaSum));

    const keyOneHot = new Array(12).fill(0);
    const keyIdx = PITCH_CLASSES.indexOf(features.key.key);
    if (keyIdx >= 0) keyOneHot[keyIdx] = features.key.scale === 'major' ? 1 : -1;
    embedding.push(...keyOneHot);

    // Rhythm: 16 dims
    embedding.push(features.tempo.bpm / 200); // Normalized tempo
    embedding.push(features.tempo.confidence);
    embedding.push(...new Array(14).fill(0).map((_, i) => Math.sin((i * features.tempo.bpm) / 50)));

    // Timbre: 32 dims (MFCC + spectral)
    embedding.push(...features.mfccMean.slice(0, 13).map((m) => m / 100));
    embedding.push(...features.mfccStd.slice(0, 13).map((s) => s / 10));
    embedding.push(features.spectral.centroidMean / 5000);
    embedding.push(features.spectral.flatnessMean);
    embedding.push(features.spectral.rolloffMean / 10000);
    embedding.push(...new Array(3).fill(0)); // Padding

    // Dynamics: 16 dims
    embedding.push((features.loudness.integrated + 60) / 60); // Normalize from -60dB to 0dB
    embedding.push(features.loudness.range / 20);
    const energyHistogram = this.computeHistogram(features.energyCurve, 14);
    embedding.push(...energyHistogram);

    // Structure: 40 dims (segment distribution)
    const segmentCounts = { intro: 0, verse: 0, chorus: 0, bridge: 0, breakdown: 0, outro: 0, instrumental: 0, unknown: 0 };
    for (const seg of timeline.segments) {
      segmentCounts[seg.label]++;
    }
    const totalSegments = timeline.segments.length || 1;
    embedding.push(segmentCounts.intro / totalSegments);
    embedding.push(segmentCounts.verse / totalSegments);
    embedding.push(segmentCounts.chorus / totalSegments);
    embedding.push(segmentCounts.bridge / totalSegments);
    embedding.push(segmentCounts.breakdown / totalSegments);
    embedding.push(segmentCounts.outro / totalSegments);
    embedding.push(timeline.segments.length / 10);

    // Pad to 128 dims
    while (embedding.length < 128) {
      embedding.push(0);
    }

    return embedding.slice(0, 128);
  }

  private computeHistogram(values: number[], bins: number): number[] {
    const histogram = new Array(bins).fill(0);
    for (const v of values) {
      const bin = Math.min(bins - 1, Math.floor(v * bins));
      histogram[bin]++;
    }
    const total = values.length || 1;
    return histogram.map((h) => h / total);
  }

  private downsample(arr: number[], targetLength: number): number[] {
    if (arr.length <= targetLength) return arr;

    const result: number[] = [];
    const ratio = arr.length / targetLength;

    for (let i = 0; i < targetLength; i++) {
      const start = Math.floor(i * ratio);
      const end = Math.floor((i + 1) * ratio);
      let sum = 0;
      for (let j = start; j < end; j++) {
        sum += arr[j];
      }
      result.push(sum / (end - start));
    }

    return result;
  }

  private mean(arr: number[]): number {
    if (arr.length === 0) return 0;
    return arr.reduce((a, b) => a + b, 0) / arr.length;
  }

  private std(arr: number[]): number {
    if (arr.length === 0) return 0;
    const m = this.mean(arr);
    const variance = arr.reduce((sum, x) => sum + (x - m) * (x - m), 0) / arr.length;
    return Math.sqrt(variance);
  }

  cleanup(): void {
    if (this.audioContext) {
      this.audioContext.close();
      this.audioContext = null;
    }
  }
}

// Singleton instance
let extractorInstance: AudioFeatureExtractor | null = null;

export function getAudioExtractor(): AudioFeatureExtractor {
  if (!extractorInstance) {
    extractorInstance = new AudioFeatureExtractor();
  }
  return extractorInstance;
}
