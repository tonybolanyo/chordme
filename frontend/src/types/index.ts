// Common type definitions for the ChordMe application
export interface Song {
  id: string;
  title: string;
  artist: string;
  lyrics: string;
  chords: string[];
  createdAt: Date;
  updatedAt: Date;
}

export interface Chord {
  name: string;
  fingering: string;
  diagram?: string;
}

export interface User {
  id: string;
  username: string;
  email: string;
}
