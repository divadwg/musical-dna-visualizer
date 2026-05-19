import Dexie, { type Table } from 'dexie';
import type { SongDNA } from '@/types/audio-features';

// Audio blob storage (separate from metadata for performance)
interface AudioBlob {
  id: string;
  blob: Blob;
  createdAt: number;
}

class MusicDNADatabase extends Dexie {
  songs!: Table<SongDNA>;
  audioBlobs!: Table<AudioBlob>;

  constructor() {
    super('MusicDNADB');

    this.version(1).stores({
      songs: 'id, metadata.filename, features.key.key, features.tempo.bpm, createdAt',
      audioBlobs: 'id, createdAt',
    });
  }
}

export const db = new MusicDNADatabase();

// Helper functions
export async function saveSong(song: SongDNA): Promise<void> {
  await db.songs.put(song);
}

export async function getSong(id: string): Promise<SongDNA | undefined> {
  return db.songs.get(id);
}

export async function getAllSongs(): Promise<SongDNA[]> {
  return db.songs.toArray();
}

export async function deleteSong(id: string): Promise<void> {
  await db.songs.delete(id);
  await db.audioBlobs.delete(id);
}

export async function saveAudioBlob(id: string, blob: Blob): Promise<void> {
  await db.audioBlobs.put({ id, blob, createdAt: Date.now() });
}

export async function getAudioBlob(id: string): Promise<Blob | undefined> {
  const record = await db.audioBlobs.get(id);
  return record?.blob;
}

export async function clearAllData(): Promise<void> {
  await db.songs.clear();
  await db.audioBlobs.clear();
}
