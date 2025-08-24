/**
 * Firestore Security Rules Tests
 * 
 * These tests validate that the Firestore security rules properly enforce
 * authentication and authorization requirements for the ChordMe application.
 */

import { 
  initializeTestEnvironment,
  assertSucceeds,
  assertFails,
  RulesTestEnvironment,
  RulesTestContext,
} from '@firebase/rules-unit-testing';
import { 
  doc, 
  getDoc, 
  setDoc, 
  updateDoc, 
  deleteDoc, 
  collection, 
  addDoc, 
  query, 
  where, 
  getDocs,
  Timestamp 
} from 'firebase/firestore';
import { beforeAll, afterAll, beforeEach, describe, it, expect } from 'vitest';

describe('Firestore Security Rules', () => {
  let testEnv: RulesTestEnvironment;
  
  // Test user IDs
  const USER_1_ID = 'user1';
  const USER_2_ID = 'user2';
  const SONG_1_ID = 'song1';
  const SONG_2_ID = 'song2';
  const CHORD_1_ID = 'chord1';
  
  // Test data
  const validUserData = {
    email: 'test@example.com',
    created_at: Timestamp.now(),
    updated_at: Timestamp.now(),
  };
  
  const validSongData = {
    title: 'Test Song',
    author_id: USER_1_ID,
    content: '{title: Test Song}\n[C]Hello [G]world',
    created_at: Timestamp.now(),
    updated_at: Timestamp.now(),
  };
  
  const validChordData = {
    name: 'C',
    definition: '0 3 2 0 1 0',
    owner_id: USER_1_ID,
    description: 'C Major chord',
    created_at: Timestamp.now(),
    updated_at: Timestamp.now(),
  };

  beforeAll(async () => {
    try {
      testEnv = await initializeTestEnvironment({
        projectId: 'demo-chordme-test',
        firestore: {
          host: 'localhost',
          port: 8080,
          rules: require('fs').readFileSync('/home/runner/work/chordme/chordme/firestore.rules', 'utf8'),
        },
      });
    } catch (error) {
      console.warn('Firebase emulator not available. Security rules tests will be skipped.');
      console.warn('To run security rules tests, start the Firebase emulator:');
      console.warn('  firebase emulators:start --only firestore');
      throw error;
    }
  });

  afterAll(async () => {
    if (testEnv) {
      await testEnv.cleanup();
    }
  });

  beforeEach(async () => {
    await testEnv.clearFirestore();
  });

  describe('Authentication Requirements', () => {
    it('should deny all access to unauthenticated users', async () => {
      const unauthedContext = testEnv.unauthenticatedContext();
      
      // Test users collection
      await assertFails(getDoc(doc(unauthedContext.firestore(), 'users', USER_1_ID)));
      await assertFails(setDoc(doc(unauthedContext.firestore(), 'users', USER_1_ID), validUserData));
      
      // Test songs collection
      await assertFails(getDoc(doc(unauthedContext.firestore(), 'songs', SONG_1_ID)));
      await assertFails(setDoc(doc(unauthedContext.firestore(), 'songs', SONG_1_ID), validSongData));
      
      // Test chords collection
      await assertFails(getDoc(doc(unauthedContext.firestore(), 'chords', CHORD_1_ID)));
      await assertFails(setDoc(doc(unauthedContext.firestore(), 'chords', CHORD_1_ID), validChordData));
    });
  });

  describe('Users Collection Security', () => {
    it('should allow users to read their own user document', async () => {
      const user1Context = testEnv.authenticatedContext(USER_1_ID);
      
      // First create the user document
      await assertSucceeds(setDoc(doc(user1Context.firestore(), 'users', USER_1_ID), validUserData));
      
      // Then read it
      await assertSucceeds(getDoc(doc(user1Context.firestore(), 'users', USER_1_ID)));
    });

    it('should deny users from reading other users documents', async () => {
      const user1Context = testEnv.authenticatedContext(USER_1_ID);
      const user2Context = testEnv.authenticatedContext(USER_2_ID);
      
      // User 1 creates their document
      await assertSucceeds(setDoc(doc(user1Context.firestore(), 'users', USER_1_ID), validUserData));
      
      // User 2 tries to read User 1's document
      await assertFails(getDoc(doc(user2Context.firestore(), 'users', USER_1_ID)));
    });

    it('should allow users to create their own user document with valid data', async () => {
      const user1Context = testEnv.authenticatedContext(USER_1_ID);
      
      await assertSucceeds(setDoc(doc(user1Context.firestore(), 'users', USER_1_ID), validUserData));
    });

    it('should deny users from creating other users documents', async () => {
      const user1Context = testEnv.authenticatedContext(USER_1_ID);
      
      await assertFails(setDoc(doc(user1Context.firestore(), 'users', USER_2_ID), validUserData));
    });

    it('should validate user data structure', async () => {
      const user1Context = testEnv.authenticatedContext(USER_1_ID);
      
      // Missing required fields
      await assertFails(setDoc(doc(user1Context.firestore(), 'users', USER_1_ID), {
        email: 'test@example.com'
      }));
      
      // Invalid email
      await assertFails(setDoc(doc(user1Context.firestore(), 'users', USER_1_ID), {
        ...validUserData,
        email: 'invalid-email'
      }));
      
      // Email too long
      await assertFails(setDoc(doc(user1Context.firestore(), 'users', USER_1_ID), {
        ...validUserData,
        email: 'a'.repeat(120) + '@example.com'
      }));
    });

    it('should allow updating user data but preserve creation time', async () => {
      const user1Context = testEnv.authenticatedContext(USER_1_ID);
      
      // Create initial document
      await assertSucceeds(setDoc(doc(user1Context.firestore(), 'users', USER_1_ID), validUserData));
      
      // Update with same creation time should succeed
      await assertSucceeds(updateDoc(doc(user1Context.firestore(), 'users', USER_1_ID), {
        email: 'updated@example.com',
        updated_at: Timestamp.now(),
      }));
      
      // Update with different creation time should fail
      await assertFails(updateDoc(doc(user1Context.firestore(), 'users', USER_1_ID), {
        created_at: Timestamp.now(),
      }));
    });
  });

  describe('Songs Collection Security', () => {
    it('should allow users to create songs they own', async () => {
      const user1Context = testEnv.authenticatedContext(USER_1_ID);
      
      await assertSucceeds(setDoc(doc(user1Context.firestore(), 'songs', SONG_1_ID), validSongData));
    });

    it('should deny users from creating songs for other users', async () => {
      const user1Context = testEnv.authenticatedContext(USER_1_ID);
      
      const songForUser2 = {
        ...validSongData,
        author_id: USER_2_ID,
      };
      
      await assertFails(setDoc(doc(user1Context.firestore(), 'songs', SONG_1_ID), songForUser2));
    });

    it('should allow users to read their own songs', async () => {
      const user1Context = testEnv.authenticatedContext(USER_1_ID);
      
      // Create song
      await assertSucceeds(setDoc(doc(user1Context.firestore(), 'songs', SONG_1_ID), validSongData));
      
      // Read song
      await assertSucceeds(getDoc(doc(user1Context.firestore(), 'songs', SONG_1_ID)));
    });

    it('should deny users from reading other users songs', async () => {
      const user1Context = testEnv.authenticatedContext(USER_1_ID);
      const user2Context = testEnv.authenticatedContext(USER_2_ID);
      
      // User 1 creates a song
      await assertSucceeds(setDoc(doc(user1Context.firestore(), 'songs', SONG_1_ID), validSongData));
      
      // User 2 tries to read User 1's song
      await assertFails(getDoc(doc(user2Context.firestore(), 'songs', SONG_1_ID)));
    });

    it('should allow users to update their own songs', async () => {
      const user1Context = testEnv.authenticatedContext(USER_1_ID);
      
      // Create song
      await assertSucceeds(setDoc(doc(user1Context.firestore(), 'songs', SONG_1_ID), validSongData));
      
      // Update song
      await assertSucceeds(updateDoc(doc(user1Context.firestore(), 'songs', SONG_1_ID), {
        title: 'Updated Song Title',
        updated_at: Timestamp.now(),
      }));
    });

    it('should deny users from updating other users songs', async () => {
      const user1Context = testEnv.authenticatedContext(USER_1_ID);
      const user2Context = testEnv.authenticatedContext(USER_2_ID);
      
      // User 1 creates a song
      await assertSucceeds(setDoc(doc(user1Context.firestore(), 'songs', SONG_1_ID), validSongData));
      
      // User 2 tries to update User 1's song
      await assertFails(updateDoc(doc(user2Context.firestore(), 'songs', SONG_1_ID), {
        title: 'Hacked Title',
      }));
    });

    it('should deny changing song ownership or creation time', async () => {
      const user1Context = testEnv.authenticatedContext(USER_1_ID);
      
      // Create song
      await assertSucceeds(setDoc(doc(user1Context.firestore(), 'songs', SONG_1_ID), validSongData));
      
      // Try to change ownership
      await assertFails(updateDoc(doc(user1Context.firestore(), 'songs', SONG_1_ID), {
        author_id: USER_2_ID,
      }));
      
      // Try to change creation time
      await assertFails(updateDoc(doc(user1Context.firestore(), 'songs', SONG_1_ID), {
        created_at: Timestamp.now(),
      }));
    });

    it('should allow users to delete their own songs', async () => {
      const user1Context = testEnv.authenticatedContext(USER_1_ID);
      
      // Create song
      await assertSucceeds(setDoc(doc(user1Context.firestore(), 'songs', SONG_1_ID), validSongData));
      
      // Delete song
      await assertSucceeds(deleteDoc(doc(user1Context.firestore(), 'songs', SONG_1_ID)));
    });

    it('should deny users from deleting other users songs', async () => {
      const user1Context = testEnv.authenticatedContext(USER_1_ID);
      const user2Context = testEnv.authenticatedContext(USER_2_ID);
      
      // User 1 creates a song
      await assertSucceeds(setDoc(doc(user1Context.firestore(), 'songs', SONG_1_ID), validSongData));
      
      // User 2 tries to delete User 1's song
      await assertFails(deleteDoc(doc(user2Context.firestore(), 'songs', SONG_1_ID)));
    });

    it('should validate song data structure', async () => {
      const user1Context = testEnv.authenticatedContext(USER_1_ID);
      
      // Missing required fields
      await assertFails(setDoc(doc(user1Context.firestore(), 'songs', SONG_1_ID), {
        title: 'Test Song',
        author_id: USER_1_ID,
      }));
      
      // Title too long
      await assertFails(setDoc(doc(user1Context.firestore(), 'songs', SONG_1_ID), {
        ...validSongData,
        title: 'a'.repeat(201),
      }));
      
      // Content too long
      await assertFails(setDoc(doc(user1Context.firestore(), 'songs', SONG_1_ID), {
        ...validSongData,
        content: 'a'.repeat(50001),
      }));
      
      // Invalid timestamp
      await assertFails(setDoc(doc(user1Context.firestore(), 'songs', SONG_1_ID), {
        ...validSongData,
        created_at: 'not a timestamp',
      }));
    });

    it('should allow querying user\'s own songs', async () => {
      const user1Context = testEnv.authenticatedContext(USER_1_ID);
      
      // Create multiple songs for user 1
      await assertSucceeds(setDoc(doc(user1Context.firestore(), 'songs', SONG_1_ID), validSongData));
      await assertSucceeds(setDoc(doc(user1Context.firestore(), 'songs', SONG_2_ID), {
        ...validSongData,
        title: 'Second Song',
      }));
      
      // Query user's songs
      const songsQuery = query(
        collection(user1Context.firestore(), 'songs'),
        where('author_id', '==', USER_1_ID)
      );
      await assertSucceeds(getDocs(songsQuery));
    });
  });

  describe('Chords Collection Security', () => {
    it('should allow users to create chords they own', async () => {
      const user1Context = testEnv.authenticatedContext(USER_1_ID);
      
      await assertSucceeds(setDoc(doc(user1Context.firestore(), 'chords', CHORD_1_ID), validChordData));
    });

    it('should deny users from creating chords for other users', async () => {
      const user1Context = testEnv.authenticatedContext(USER_1_ID);
      
      const chordForUser2 = {
        ...validChordData,
        owner_id: USER_2_ID,
      };
      
      await assertFails(setDoc(doc(user1Context.firestore(), 'chords', CHORD_1_ID), chordForUser2));
    });

    it('should allow users to read their own chords', async () => {
      const user1Context = testEnv.authenticatedContext(USER_1_ID);
      
      // Create chord
      await assertSucceeds(setDoc(doc(user1Context.firestore(), 'chords', CHORD_1_ID), validChordData));
      
      // Read chord
      await assertSucceeds(getDoc(doc(user1Context.firestore(), 'chords', CHORD_1_ID)));
    });

    it('should deny users from reading other users chords', async () => {
      const user1Context = testEnv.authenticatedContext(USER_1_ID);
      const user2Context = testEnv.authenticatedContext(USER_2_ID);
      
      // User 1 creates a chord
      await assertSucceeds(setDoc(doc(user1Context.firestore(), 'chords', CHORD_1_ID), validChordData));
      
      // User 2 tries to read User 1's chord
      await assertFails(getDoc(doc(user2Context.firestore(), 'chords', CHORD_1_ID)));
    });

    it('should validate chord data structure', async () => {
      const user1Context = testEnv.authenticatedContext(USER_1_ID);
      
      // Missing required fields
      await assertFails(setDoc(doc(user1Context.firestore(), 'chords', CHORD_1_ID), {
        name: 'C',
        owner_id: USER_1_ID,
      }));
      
      // Name too long
      await assertFails(setDoc(doc(user1Context.firestore(), 'chords', CHORD_1_ID), {
        ...validChordData,
        name: 'a'.repeat(51),
      }));
      
      // Definition too long
      await assertFails(setDoc(doc(user1Context.firestore(), 'chords', CHORD_1_ID), {
        ...validChordData,
        definition: 'a'.repeat(1001),
      }));
      
      // Valid chord without optional description
      await assertSucceeds(setDoc(doc(user1Context.firestore(), 'chords', CHORD_1_ID), {
        name: 'C',
        definition: '0 3 2 0 1 0',
        owner_id: USER_1_ID,
        created_at: Timestamp.now(),
        updated_at: Timestamp.now(),
      }));
    });
  });

  describe('Song Sharing (Future Feature)', () => {
    it('should allow song owners to create sharing documents', async () => {
      const user1Context = testEnv.authenticatedContext(USER_1_ID);
      
      // Create a song first
      await assertSucceeds(setDoc(doc(user1Context.firestore(), 'songs', SONG_1_ID), validSongData));
      
      // Create sharing document
      const shareData = {
        user_id: USER_2_ID,
        permissions: ['read'],
        created_at: Timestamp.now(),
      };
      
      await assertSucceeds(setDoc(
        doc(user1Context.firestore(), 'songs', SONG_1_ID, 'shared', 'share1'),
        shareData
      ));
    });

    it('should deny non-owners from creating sharing documents', async () => {
      const user1Context = testEnv.authenticatedContext(USER_1_ID);
      const user2Context = testEnv.authenticatedContext(USER_2_ID);
      
      // User 1 creates a song
      await assertSucceeds(setDoc(doc(user1Context.firestore(), 'songs', SONG_1_ID), validSongData));
      
      // User 2 tries to create sharing document
      const shareData = {
        user_id: USER_2_ID,
        permissions: ['read'],
        created_at: Timestamp.now(),
      };
      
      await assertFails(setDoc(
        doc(user2Context.firestore(), 'songs', SONG_1_ID, 'shared', 'share1'),
        shareData
      ));
    });

    it('should validate sharing data structure', async () => {
      const user1Context = testEnv.authenticatedContext(USER_1_ID);
      
      // Create a song first
      await assertSucceeds(setDoc(doc(user1Context.firestore(), 'songs', SONG_1_ID), validSongData));
      
      // Invalid permissions
      await assertFails(setDoc(
        doc(user1Context.firestore(), 'songs', SONG_1_ID, 'shared', 'share1'),
        {
          user_id: USER_2_ID,
          permissions: ['invalid'],
          created_at: Timestamp.now(),
        }
      ));
      
      // Missing required fields
      await assertFails(setDoc(
        doc(user1Context.firestore(), 'songs', SONG_1_ID, 'shared', 'share1'),
        {
          user_id: USER_2_ID,
        }
      ));
    });
  });

  describe('Security Boundary Tests', () => {
    it('should deny access to undefined collections', async () => {
      const user1Context = testEnv.authenticatedContext(USER_1_ID);
      
      // Try to access undefined collection
      await assertFails(getDoc(doc(user1Context.firestore(), 'undefined-collection', 'doc1')));
      await assertFails(setDoc(doc(user1Context.firestore(), 'undefined-collection', 'doc1'), { data: 'test' }));
    });

    it('should prevent privilege escalation through document references', async () => {
      const user1Context = testEnv.authenticatedContext(USER_1_ID);
      const user2Context = testEnv.authenticatedContext(USER_2_ID);
      
      // User 1 creates a song
      await assertSucceeds(setDoc(doc(user1Context.firestore(), 'songs', SONG_1_ID), validSongData));
      
      // User 2 tries to read the song using a different path or method
      await assertFails(getDoc(doc(user2Context.firestore(), 'songs', SONG_1_ID)));
    });
  });
});