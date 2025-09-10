/**
 * Firestore Security Rules Validation Tests
 *
 * These tests validate the structure and syntax of the Firestore security rules
 * without requiring the Firebase emulator to be running.
 */

import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';

describe('Firestore Security Rules Validation', () => {
  const rulesPath = path.join(process.cwd(), '..', 'firestore.rules');
  const firebaseConfigPath = path.join(process.cwd(), '..', 'firebase.json');
  const indexesPath = path.join(process.cwd(), '..', 'firestore.indexes.json');

  it('should have firestore.rules file', () => {
    expect(fs.existsSync(rulesPath)).toBe(true);
  });

  it('should have valid rules syntax', () => {
    const rulesContent = fs.readFileSync(rulesPath, 'utf8');

    // Check for required rule structure
    expect(rulesContent).toContain("rules_version = '2'");
    expect(rulesContent).toContain('service cloud.firestore');
    expect(rulesContent).toContain('match /databases/{database}/documents');
  });

  it('should contain authentication checks', () => {
    const rulesContent = fs.readFileSync(rulesPath, 'utf8');

    // Check for authentication functions and checks
    expect(rulesContent).toContain('request.auth != null');
    expect(rulesContent).toContain('isAuthenticated()');
    expect(rulesContent).toContain('isOwner(');
  });

  it('should protect users collection', () => {
    const rulesContent = fs.readFileSync(rulesPath, 'utf8');

    expect(rulesContent).toContain('match /users/{userId}');
    expect(rulesContent).toContain('isOwner(userId)');
  });

  it('should protect songs collection', () => {
    const rulesContent = fs.readFileSync(rulesPath, 'utf8');

    expect(rulesContent).toContain('match /songs/{songId}');
    expect(rulesContent).toContain('author_id');
    expect(rulesContent).toContain('isValidSongData()');
  });

  it('should protect chords collection', () => {
    const rulesContent = fs.readFileSync(rulesPath, 'utf8');

    expect(rulesContent).toContain('match /chords/{chordId}');
    expect(rulesContent).toContain('owner_id');
    expect(rulesContent).toContain('isValidChordData()');
  });

  it('should have data validation functions', () => {
    const rulesContent = fs.readFileSync(rulesPath, 'utf8');

    expect(rulesContent).toContain('isValidEmail(');
    expect(rulesContent).toContain('isValidString(');
    expect(rulesContent).toContain('isValidTimestamp(');
  });

  it('should deny access to other collections', () => {
    const rulesContent = fs.readFileSync(rulesPath, 'utf8');

    // Should have a catch-all rule that denies access
    expect(rulesContent).toContain('match /{document=**}');
    expect(rulesContent).toContain('allow read, write: if false');
  });

  it('should have sharing capability for future use', () => {
    const rulesContent = fs.readFileSync(rulesPath, 'utf8');

    expect(rulesContent).toContain('match /shared/{shareId}');
    expect(rulesContent).toContain('isSharedWithUser()');
  });

  it('should have firebase.json configuration', () => {
    expect(fs.existsSync(firebaseConfigPath)).toBe(true);

    const config = JSON.parse(fs.readFileSync(firebaseConfigPath, 'utf8'));
    expect(config.firestore).toBeDefined();
    expect(config.firestore.rules).toBe('firestore.rules');
    expect(config.firestore.indexes).toBe('firestore.indexes.json');
  });

  it('should have firestore indexes configuration', () => {
    expect(fs.existsSync(indexesPath)).toBe(true);

    const indexes = JSON.parse(fs.readFileSync(indexesPath, 'utf8'));
    expect(indexes.indexes).toBeDefined();
    expect(Array.isArray(indexes.indexes)).toBe(true);
  });

  it('should have necessary indexes for queries', () => {
    const indexes = JSON.parse(fs.readFileSync(indexesPath, 'utf8'));

    // Check for songs indexes
    const songsIndexes = indexes.indexes.filter(
      (index: unknown) => index.collectionGroup === 'songs'
    );
    expect(songsIndexes.length).toBeGreaterThan(0);

    // Check for chords indexes
    const chordsIndexes = indexes.indexes.filter(
      (index: unknown) => index.collectionGroup === 'chords'
    );
    expect(chordsIndexes.length).toBeGreaterThan(0);
  });

  it('should validate required permissions in rules', () => {
    const rulesContent = fs.readFileSync(rulesPath, 'utf8');

    // Check that rules specify appropriate permissions
    expect(rulesContent).toContain('allow read');
    expect(rulesContent).toContain('allow create');
    expect(rulesContent).toContain('allow update');
    expect(rulesContent).toContain('allow delete');
    // Combined read, write permissions
    expect(rulesContent).toContain('allow read, write');
  });

  it('should prevent changing ownership fields', () => {
    const rulesContent = fs.readFileSync(rulesPath, 'utf8');

    // Should prevent changing author_id and created_at
    expect(rulesContent).toContain(
      'request.resource.data.author_id == resource.data.author_id'
    );
    expect(rulesContent).toContain(
      'request.resource.data.created_at == resource.data.created_at'
    );
  });

  it('should have proper field validation limits', () => {
    const rulesContent = fs.readFileSync(rulesPath, 'utf8');

    // Check for field length validations
    expect(rulesContent).toContain('120'); // Email max length
    expect(rulesContent).toContain('200'); // Song title max length
    expect(rulesContent).toContain('50000'); // Song content max length
    expect(rulesContent).toContain('50'); // Chord name max length
    expect(rulesContent).toContain('1000'); // Chord definition max length
  });
});
