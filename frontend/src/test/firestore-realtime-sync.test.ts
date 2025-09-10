// Integration tests for Firestore real-time sync behavior
import {
  describe,
  it,
  expect,
  beforeAll,
  afterAll,
  beforeEach,
  vi,
} from 'vitest';
import {
  initializeTestEnvironment,
  RulesTestEnvironment,
  assertSucceeds,
} from '@firebase/rules-unit-testing';
import {
  doc,
  setDoc,
  updateDoc,
  deleteDoc,
  onSnapshot,
  collection,
  query,
  where,
  Timestamp,
} from 'firebase/firestore';

describe('Firestore Real-time Sync Behavior - Integration Tests', () => {
  let testEnv: RulesTestEnvironment;

  const PROJECT_ID = 'test-realtime-sync';
  const USER_1_ID = 'user-1';
  const USER_2_ID = 'user-2';

  beforeAll(async () => {
    try {
      testEnv = await initializeTestEnvironment({
        projectId: PROJECT_ID,
        firestore: {
          rules: `
            rules_version = '2';
            service cloud.firestore {
              match /databases/{database}/documents {
                match /{document=**} {
                  allow read, write: if true;
                }
              }
            }
          `,
        },
      });
    } catch (error) {
      console.warn(
        'Firebase emulator not available. Real-time sync tests will be skipped.'
      );
      console.warn('To run real-time sync tests, start the Firebase emulator:');
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

  describe('Single Document Real-time Updates', () => {
    it('should receive real-time updates when document changes', async () => {
      const context1 = testEnv.authenticatedContext(USER_1_ID);
      const context2 = testEnv.authenticatedContext(USER_2_ID);

      const db1 = context1.firestore();
      const db2 = context2.firestore();

      const songId = 'realtime-song-1';
      const songRef1 = doc(db1, 'songs', songId);
      const songRef2 = doc(db2, 'songs', songId);

      // Initial song data
      const initialData = {
        title: 'Original Title',
        artist: 'Original Artist',
        content: '{title: Original}\n[C]Hello [G]World',
        user_id: USER_1_ID,
        created_at: Timestamp.now(),
        updated_at: Timestamp.now(),
      };

      await assertSucceeds(setDoc(songRef1, initialData));

      // Set up listener from second client
      const updates: unknown[] = [];
      const unsubscribe = onSnapshot(songRef2, (snapshot) => {
        if (snapshot.exists()) {
          updates.push({
            timestamp: Date.now(),
            data: snapshot.data(),
            id: snapshot.id,
          });
        }
      });

      // Wait a bit for initial snapshot
      await new Promise((resolve) => setTimeout(resolve, 100));

      // Update from first client
      await assertSucceeds(
        updateDoc(songRef1, {
          title: 'Updated Title',
          updated_at: Timestamp.now(),
        })
      );

      // Wait for real-time update to propagate
      await new Promise((resolve) => setTimeout(resolve, 200));

      // Another update
      await assertSucceeds(
        updateDoc(songRef1, {
          artist: 'Updated Artist',
          updated_at: Timestamp.now(),
        })
      );

      await new Promise((resolve) => setTimeout(resolve, 200));

      unsubscribe();

      // Should have received multiple updates
      expect(updates.length).toBeGreaterThanOrEqual(3); // Initial + 2 updates

      // Check that updates show progression
      expect(updates[0].data.title).toBe('Original Title');
      expect(updates[0].data.artist).toBe('Original Artist');

      const lastUpdate = updates[updates.length - 1];
      expect(lastUpdate.data.title).toBe('Updated Title');
      expect(lastUpdate.data.artist).toBe('Updated Artist');
    });

    it('should handle document deletion in real-time', async () => {
      const context1 = testEnv.authenticatedContext(USER_1_ID);
      const context2 = testEnv.authenticatedContext(USER_2_ID);

      const db1 = context1.firestore();
      const db2 = context2.firestore();

      const songId = 'deletion-song';
      const songRef1 = doc(db1, 'songs', songId);
      const songRef2 = doc(db2, 'songs', songId);

      const songData = {
        title: 'Song to Delete',
        user_id: USER_1_ID,
        created_at: Timestamp.now(),
        updated_at: Timestamp.now(),
      };

      await assertSucceeds(setDoc(songRef1, songData));

      // Set up listener
      const snapshots: unknown[] = [];
      const unsubscribe = onSnapshot(songRef2, (snapshot) => {
        snapshots.push({
          exists: snapshot.exists(),
          data: snapshot.exists() ? snapshot.data() : null,
        });
      });

      await new Promise((resolve) => setTimeout(resolve, 100));

      // Delete the document
      await assertSucceeds(deleteDoc(songRef1));

      await new Promise((resolve) => setTimeout(resolve, 200));

      unsubscribe();

      // Should have received at least 2 snapshots: exists and deleted
      expect(snapshots.length).toBeGreaterThanOrEqual(2);
      expect(snapshots[0].exists).toBe(true);
      expect(snapshots[0].data.title).toBe('Song to Delete');

      const lastSnapshot = snapshots[snapshots.length - 1];
      expect(lastSnapshot.exists).toBe(false);
      expect(lastSnapshot.data).toBeNull();
    });

    it('should handle rapid successive updates', async () => {
      const context1 = testEnv.authenticatedContext(USER_1_ID);
      const context2 = testEnv.authenticatedContext(USER_2_ID);

      const db1 = context1.firestore();
      const db2 = context2.firestore();

      const songId = 'rapid-updates-song';
      const songRef1 = doc(db1, 'songs', songId);
      const songRef2 = doc(db2, 'songs', songId);

      const initialData = {
        title: 'Rapid Update Test',
        counter: 0,
        user_id: USER_1_ID,
        created_at: Timestamp.now(),
        updated_at: Timestamp.now(),
      };

      await assertSucceeds(setDoc(songRef1, initialData));

      // Set up listener
      const updates: number[] = [];
      const unsubscribe = onSnapshot(songRef2, (snapshot) => {
        if (snapshot.exists()) {
          updates.push(snapshot.data().counter);
        }
      });

      await new Promise((resolve) => setTimeout(resolve, 100));

      // Perform rapid updates
      const updatePromises = [];
      for (let i = 1; i <= 5; i++) {
        updatePromises.push(
          assertSucceeds(
            updateDoc(songRef1, {
              counter: i,
              updated_at: Timestamp.now(),
            })
          )
        );
      }

      await Promise.all(updatePromises);
      await new Promise((resolve) => setTimeout(resolve, 300));

      unsubscribe();

      // Should receive updates (may not get all due to batching)
      expect(updates.length).toBeGreaterThanOrEqual(2); // Initial + at least one update
      expect(updates[0]).toBe(0); // Initial state
      expect(updates[updates.length - 1]).toBe(5); // Final state
    });
  });

  describe('Collection Real-time Updates', () => {
    it('should receive updates when documents are added to collection', async () => {
      const context1 = testEnv.authenticatedContext(USER_1_ID);
      const context2 = testEnv.authenticatedContext(USER_2_ID);

      const db1 = context1.firestore();
      const db2 = context2.firestore();

      // Set up listener for user's songs collection
      const songsQuery = query(
        collection(db2, 'songs'),
        where('user_id', '==', USER_1_ID)
      );

      const collectionUpdates: unknown[] = [];
      const unsubscribe = onSnapshot(songsQuery, (snapshot) => {
        collectionUpdates.push({
          size: snapshot.size,
          docs: snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() })),
        });
      });

      await new Promise((resolve) => setTimeout(resolve, 100));

      // Add songs from first client
      const song1Data = {
        title: 'Song 1',
        user_id: USER_1_ID,
        created_at: Timestamp.now(),
        updated_at: Timestamp.now(),
      };

      const song2Data = {
        title: 'Song 2',
        user_id: USER_1_ID,
        created_at: Timestamp.now(),
        updated_at: Timestamp.now(),
      };

      await assertSucceeds(setDoc(doc(db1, 'songs', 'song-1'), song1Data));
      await new Promise((resolve) => setTimeout(resolve, 100));

      await assertSucceeds(setDoc(doc(db1, 'songs', 'song-2'), song2Data));
      await new Promise((resolve) => setTimeout(resolve, 100));

      unsubscribe();

      // Should have received updates as documents were added
      expect(collectionUpdates.length).toBeGreaterThanOrEqual(3); // Initial empty + 2 additions
      expect(collectionUpdates[0].size).toBe(0);
      expect(collectionUpdates[collectionUpdates.length - 1].size).toBe(2);
    });

    it('should receive updates when documents are modified in collection', async () => {
      const context1 = testEnv.authenticatedContext(USER_1_ID);
      const context2 = testEnv.authenticatedContext(USER_2_ID);

      const db1 = context1.firestore();
      const db2 = context2.firestore();

      // Create initial songs
      const song1Data = {
        title: 'Original Song 1',
        status: 'draft',
        user_id: USER_1_ID,
        created_at: Timestamp.now(),
        updated_at: Timestamp.now(),
      };

      const song2Data = {
        title: 'Original Song 2',
        status: 'draft',
        user_id: USER_1_ID,
        created_at: Timestamp.now(),
        updated_at: Timestamp.now(),
      };

      await assertSucceeds(
        setDoc(doc(db1, 'songs', 'modify-song-1'), song1Data)
      );
      await assertSucceeds(
        setDoc(doc(db1, 'songs', 'modify-song-2'), song2Data)
      );

      // Set up listener
      const songsQuery = query(
        collection(db2, 'songs'),
        where('user_id', '==', USER_1_ID)
      );

      const modificationUpdates: unknown[] = [];
      const unsubscribe = onSnapshot(songsQuery, (snapshot) => {
        const songs = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));
        modificationUpdates.push(songs);
      });

      await new Promise((resolve) => setTimeout(resolve, 100));

      // Modify songs
      await assertSucceeds(
        updateDoc(doc(db1, 'songs', 'modify-song-1'), {
          title: 'Updated Song 1',
          status: 'published',
          updated_at: Timestamp.now(),
        })
      );

      await new Promise((resolve) => setTimeout(resolve, 100));

      await assertSucceeds(
        updateDoc(doc(db1, 'songs', 'modify-song-2'), {
          status: 'published',
          updated_at: Timestamp.now(),
        })
      );

      await new Promise((resolve) => setTimeout(resolve, 100));

      unsubscribe();

      // Should have received updates as documents were modified
      expect(modificationUpdates.length).toBeGreaterThanOrEqual(3);

      const finalUpdate = modificationUpdates[modificationUpdates.length - 1];
      expect(finalUpdate).toHaveLength(2);

      const updatedSong1 = finalUpdate.find(
        (s: unknown) => s.id === 'modify-song-1'
      );
      const updatedSong2 = finalUpdate.find(
        (s: unknown) => s.id === 'modify-song-2'
      );

      expect(updatedSong1.title).toBe('Updated Song 1');
      expect(updatedSong1.status).toBe('published');
      expect(updatedSong2.status).toBe('published');
    });

    it('should handle document removal from collection', async () => {
      const context1 = testEnv.authenticatedContext(USER_1_ID);
      const context2 = testEnv.authenticatedContext(USER_2_ID);

      const db1 = context1.firestore();
      const db2 = context2.firestore();

      // Create initial songs
      await assertSucceeds(
        setDoc(doc(db1, 'songs', 'remove-song-1'), {
          title: 'Song to Keep',
          user_id: USER_1_ID,
          created_at: Timestamp.now(),
        })
      );

      await assertSucceeds(
        setDoc(doc(db1, 'songs', 'remove-song-2'), {
          title: 'Song to Remove',
          user_id: USER_1_ID,
          created_at: Timestamp.now(),
        })
      );

      // Set up listener
      const songsQuery = query(
        collection(db2, 'songs'),
        where('user_id', '==', USER_1_ID)
      );

      const removalUpdates: unknown[] = [];
      const unsubscribe = onSnapshot(songsQuery, (snapshot) => {
        removalUpdates.push({
          size: snapshot.size,
          titles: snapshot.docs.map((doc) => doc.data().title),
        });
      });

      await new Promise((resolve) => setTimeout(resolve, 100));

      // Remove one song
      await assertSucceeds(deleteDoc(doc(db1, 'songs', 'remove-song-2')));

      await new Promise((resolve) => setTimeout(resolve, 200));

      unsubscribe();

      // Should have received updates
      expect(removalUpdates.length).toBeGreaterThanOrEqual(2);
      expect(removalUpdates[0].size).toBe(2); // Initial state
      expect(removalUpdates[removalUpdates.length - 1].size).toBe(1); // After removal
      expect(removalUpdates[removalUpdates.length - 1].titles).toContain(
        'Song to Keep'
      );
      expect(removalUpdates[removalUpdates.length - 1].titles).not.toContain(
        'Song to Remove'
      );
    });
  });

  describe('Multi-client Concurrent Editing', () => {
    it('should handle concurrent edits from multiple clients', async () => {
      const context1 = testEnv.authenticatedContext(USER_1_ID);
      const context2 = testEnv.authenticatedContext(USER_2_ID);

      const db1 = context1.firestore();
      const db2 = context2.firestore();

      const songId = 'concurrent-edit-song';
      const songRef1 = doc(db1, 'songs', songId);
      const songRef2 = doc(db2, 'songs', songId);

      // Initial song
      const initialData = {
        title: 'Collaborative Song',
        content: '{title: Collaborative Song}\n[C]Original content',
        user_id: USER_1_ID,
        collaborators: [USER_1_ID, USER_2_ID],
        created_at: Timestamp.now(),
        updated_at: Timestamp.now(),
      };

      await assertSucceeds(setDoc(songRef1, initialData));

      // Set up listeners on both clients
      const client1Updates: unknown[] = [];
      const client2Updates: unknown[] = [];

      const unsubscribe1 = onSnapshot(songRef1, (snapshot) => {
        if (snapshot.exists()) {
          client1Updates.push({
            timestamp: Date.now(),
            data: snapshot.data(),
          });
        }
      });

      const unsubscribe2 = onSnapshot(songRef2, (snapshot) => {
        if (snapshot.exists()) {
          client2Updates.push({
            timestamp: Date.now(),
            data: snapshot.data(),
          });
        }
      });

      await new Promise((resolve) => setTimeout(resolve, 100));

      // Concurrent edits
      const client1Update = updateDoc(songRef1, {
        title: 'Updated by Client 1',
        updated_at: Timestamp.now(),
      });

      const client2Update = updateDoc(songRef2, {
        content:
          '{title: Collaborative Song}\n[C]Updated by Client 2 [G]New chord',
        updated_at: Timestamp.now(),
      });

      await Promise.all([client1Update, client2Update]);

      await new Promise((resolve) => setTimeout(resolve, 300));

      unsubscribe1();
      unsubscribe2();

      // Both clients should have received updates
      expect(client1Updates.length).toBeGreaterThanOrEqual(2);
      expect(client2Updates.length).toBeGreaterThanOrEqual(2);

      // Final state should reflect both changes
      const finalState1 = client1Updates[client1Updates.length - 1].data;
      const finalState2 = client2Updates[client2Updates.length - 1].data;

      // Both clients should see the same final state
      expect(finalState1.title).toBe(finalState2.title);
      expect(finalState1.content).toBe(finalState2.content);
    });

    it('should handle conflicting updates with last-write-wins', async () => {
      const context1 = testEnv.authenticatedContext(USER_1_ID);
      const context2 = testEnv.authenticatedContext(USER_2_ID);

      const db1 = context1.firestore();
      const db2 = context2.firestore();

      const songId = 'conflict-song';
      const songRef1 = doc(db1, 'songs', songId);
      const songRef2 = doc(db2, 'songs', songId);

      const initialData = {
        title: 'Conflict Test',
        version: 0,
        user_id: USER_1_ID,
        created_at: Timestamp.now(),
        updated_at: Timestamp.now(),
      };

      await assertSucceeds(setDoc(songRef1, initialData));

      await new Promise((resolve) => setTimeout(resolve, 100));

      // Conflicting updates to the same field
      const now = Timestamp.now();

      // Client 1 update
      const update1Promise = updateDoc(songRef1, {
        title: 'Updated by Client 1',
        version: 1,
        updated_at: now,
      });

      // Client 2 update (almost simultaneously)
      const update2Promise = updateDoc(songRef2, {
        title: 'Updated by Client 2',
        version: 2,
        updated_at: Timestamp.fromMillis(now.toMillis() + 1), // Slightly later
      });

      await Promise.all([update1Promise, update2Promise]);

      await new Promise((resolve) => setTimeout(resolve, 200));

      // Check final state from both clients
      const snapshot1 = await assertSucceeds(
        context1.firestore().doc('songs', songId).get()
      );
      const snapshot2 = await assertSucceeds(
        context2.firestore().doc('songs', songId).get()
      );

      const data1 = snapshot1.data();
      const data2 = snapshot2.data();

      // Both should see the same final state (last write wins)
      expect(data1.title).toBe(data2.title);
      expect(data1.version).toBe(data2.version);

      // The later update should win
      expect(data1.title).toBe('Updated by Client 2');
      expect(data1.version).toBe(2);
    });
  });

  describe('Real-time Performance', () => {
    it('should handle high-frequency updates efficiently', async () => {
      const context1 = testEnv.authenticatedContext(USER_1_ID);
      const context2 = testEnv.authenticatedContext(USER_2_ID);

      const db1 = context1.firestore();
      const db2 = context2.firestore();

      const songId = 'performance-test-song';
      const songRef1 = doc(db1, 'songs', songId);
      const songRef2 = doc(db2, 'songs', songId);

      const initialData = {
        title: 'Performance Test',
        content: '{title: Performance Test}\n[C]Initial content',
        updateCount: 0,
        user_id: USER_1_ID,
        created_at: Timestamp.now(),
        updated_at: Timestamp.now(),
      };

      await assertSucceeds(setDoc(songRef1, initialData));

      // Track listener performance
      let updateCount = 0;
      let firstUpdateTime: number | null = null;
      let lastUpdateTime: number | null = null;

      const unsubscribe = onSnapshot(songRef2, (snapshot) => {
        if (snapshot.exists()) {
          updateCount++;
          const now = Date.now();
          if (firstUpdateTime === null) {
            firstUpdateTime = now;
          }
          lastUpdateTime = now;
        }
      });

      await new Promise((resolve) => setTimeout(resolve, 100));

      // Perform multiple rapid updates
      const updatePromises = [];
      const startTime = Date.now();

      for (let i = 1; i <= 10; i++) {
        updatePromises.push(
          updateDoc(songRef1, {
            content: `{title: Performance Test}\n[C]Update ${i} content [G]Changed`,
            updateCount: i,
            updated_at: Timestamp.now(),
          })
        );
      }

      await Promise.all(updatePromises);

      // Wait for all updates to propagate
      await new Promise((resolve) => setTimeout(resolve, 500));

      unsubscribe();

      const totalTime = lastUpdateTime! - firstUpdateTime!;

      // Performance assertions
      expect(updateCount).toBeGreaterThanOrEqual(2); // At least initial + some updates
      expect(totalTime).toBeLessThan(2000); // Updates should complete within 2 seconds

      // Verify final state is correct
      const finalSnapshot = await assertSucceeds(
        context2.firestore().doc('songs', songId).get()
      );
      const finalData = finalSnapshot.data();
      expect(finalData.updateCount).toBe(10);
    });

    it('should maintain consistency during burst updates', async () => {
      const context1 = testEnv.authenticatedContext(USER_1_ID);
      const context2 = testEnv.authenticatedContext(USER_2_ID);

      const db1 = context1.firestore();
      const db2 = context2.firestore();

      const songId = 'burst-test-song';
      const songRef1 = doc(db1, 'songs', songId);
      const songRef2 = doc(db2, 'songs', songId);

      const initialData = {
        title: 'Burst Test',
        counter: 0,
        user_id: USER_1_ID,
        created_at: Timestamp.now(),
        updated_at: Timestamp.now(),
      };

      await assertSucceeds(setDoc(songRef1, initialData));

      // Track all counter values seen by listener
      const seenCounters: number[] = [];
      const unsubscribe = onSnapshot(songRef2, (snapshot) => {
        if (snapshot.exists()) {
          seenCounters.push(snapshot.data().counter);
        }
      });

      await new Promise((resolve) => setTimeout(resolve, 100));

      // Burst of 20 updates in quick succession
      const burstUpdates = [];
      for (let i = 1; i <= 20; i++) {
        burstUpdates.push(
          updateDoc(songRef1, {
            counter: i,
            updated_at: Timestamp.now(),
          })
        );
      }

      await Promise.all(burstUpdates);
      await new Promise((resolve) => setTimeout(resolve, 1000));

      unsubscribe();

      // Should have seen at least initial (0) and final (20) states
      expect(seenCounters).toContain(0);
      expect(seenCounters).toContain(20);

      // All seen values should be in valid range
      seenCounters.forEach((counter) => {
        expect(counter).toBeGreaterThanOrEqual(0);
        expect(counter).toBeLessThanOrEqual(20);
      });

      // Should see non-decreasing sequence (due to batching, may skip some values)
      for (let i = 1; i < seenCounters.length; i++) {
        expect(seenCounters[i]).toBeGreaterThanOrEqual(seenCounters[i - 1]);
      }
    });
  });
});
