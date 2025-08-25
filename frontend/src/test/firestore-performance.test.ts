// Performance tests for real-time update throughput
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
  onSnapshot,
  collection,
  query,
  where,
  Timestamp,
  writeBatch,
} from 'firebase/firestore';

interface PerformanceMetrics {
  totalUpdates: number;
  startTime: number;
  endTime: number;
  updateLatencies: number[];
  listenerLatencies: number[];
  throughput: number;
  averageLatency: number;
  maxLatency: number;
  minLatency: number;
}

describe('Firestore Real-time Update Throughput - Performance Tests', () => {
  let testEnv: RulesTestEnvironment;

  const PROJECT_ID = 'test-performance';
  const USER_ID = 'performance-user';

  // Performance thresholds (can be adjusted based on requirements)
  const PERFORMANCE_THRESHOLDS = {
    MAX_AVERAGE_LATENCY: 500, // ms
    MAX_SINGLE_UPDATE_LATENCY: 2000, // ms
    MIN_THROUGHPUT: 10, // updates per second
    MAX_BATCH_TIME: 5000, // ms for batch operations
  };

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
        'Firebase emulator not available. Performance tests will be skipped.'
      );
      console.warn('To run performance tests, start the Firebase emulator:');
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

  const calculateMetrics = (
    updateTimes: number[],
    listenerTimes: number[]
  ): PerformanceMetrics => {
    const totalUpdates = updateTimes.length;
    const startTime = Math.min(...updateTimes);
    const endTime = Math.max(...updateTimes);
    const duration = endTime - startTime;

    const updateLatencies = updateTimes
      .map((time, index) => (index === 0 ? 0 : time - updateTimes[index - 1]))
      .slice(1);

    const listenerLatencies = listenerTimes
      .map((listenerTime, index) => {
        const updateTime = updateTimes[index];
        return updateTime ? listenerTime - updateTime : 0;
      })
      .filter((latency) => latency > 0);

    const allLatencies = [...updateLatencies, ...listenerLatencies];

    return {
      totalUpdates,
      startTime,
      endTime,
      updateLatencies,
      listenerLatencies,
      throughput: duration > 0 ? (totalUpdates / duration) * 1000 : 0,
      averageLatency:
        allLatencies.length > 0
          ? allLatencies.reduce((a, b) => a + b, 0) / allLatencies.length
          : 0,
      maxLatency: allLatencies.length > 0 ? Math.max(...allLatencies) : 0,
      minLatency: allLatencies.length > 0 ? Math.min(...allLatencies) : 0,
    };
  };

  describe('Single Document Update Performance', () => {
    it('should handle rapid sequential updates within performance thresholds', async () => {
      const context = testEnv.authenticatedContext(USER_ID);
      const db = context.firestore();

      const songId = 'performance-song-sequential';
      const songRef = doc(db, 'songs', songId);

      // Initial document
      const initialData = {
        title: 'Performance Test Song',
        content: '{title: Performance Test}\n[C]Initial content',
        updateCounter: 0,
        user_id: USER_ID,
        created_at: Timestamp.now(),
        updated_at: Timestamp.now(),
      };

      await assertSucceeds(setDoc(songRef, initialData));

      // Track update and listener timing
      const updateTimes: number[] = [];
      const listenerTimes: number[] = [];
      let updateCounter = 0;

      const unsubscribe = onSnapshot(songRef, (snapshot) => {
        if (snapshot.exists() && snapshot.data().updateCounter > 0) {
          listenerTimes.push(Date.now());
        }
      });

      await new Promise((resolve) => setTimeout(resolve, 100));

      // Perform sequential updates
      const numberOfUpdates = 50;
      const startTime = Date.now();

      for (let i = 1; i <= numberOfUpdates; i++) {
        const updateStart = Date.now();

        await assertSucceeds(
          updateDoc(songRef, {
            content: `{title: Performance Test}\n[C]Update ${i} [G]content [Am]changed`,
            updateCounter: i,
            updated_at: Timestamp.now(),
          })
        );

        updateTimes.push(Date.now());
        updateCounter = i;

        // Small delay to prevent overwhelming the emulator
        await new Promise((resolve) => setTimeout(resolve, 10));
      }

      // Wait for all listener updates to complete
      await new Promise((resolve) => setTimeout(resolve, 1000));

      unsubscribe();

      const metrics = calculateMetrics(updateTimes, listenerTimes);

      // Performance assertions
      expect(metrics.totalUpdates).toBe(numberOfUpdates);
      expect(metrics.averageLatency).toBeLessThan(
        PERFORMANCE_THRESHOLDS.MAX_AVERAGE_LATENCY
      );
      expect(metrics.maxLatency).toBeLessThan(
        PERFORMANCE_THRESHOLDS.MAX_SINGLE_UPDATE_LATENCY
      );
      expect(metrics.throughput).toBeGreaterThan(
        PERFORMANCE_THRESHOLDS.MIN_THROUGHPUT
      );

      console.log('Sequential Update Performance Metrics:', {
        totalUpdates: metrics.totalUpdates,
        throughput: `${metrics.throughput.toFixed(2)} updates/sec`,
        averageLatency: `${metrics.averageLatency.toFixed(2)}ms`,
        maxLatency: `${metrics.maxLatency.toFixed(2)}ms`,
        minLatency: `${metrics.minLatency.toFixed(2)}ms`,
      });
    });

    it('should handle burst updates with acceptable latency', async () => {
      const context = testEnv.authenticatedContext(USER_ID);
      const db = context.firestore();

      const songId = 'performance-song-burst';
      const songRef = doc(db, 'songs', songId);

      const initialData = {
        title: 'Burst Performance Test',
        burstCounter: 0,
        user_id: USER_ID,
        created_at: Timestamp.now(),
        updated_at: Timestamp.now(),
      };

      await assertSucceeds(setDoc(songRef, initialData));

      const updateTimes: number[] = [];
      const listenerTimes: number[] = [];

      const unsubscribe = onSnapshot(songRef, (snapshot) => {
        if (snapshot.exists() && snapshot.data().burstCounter > 0) {
          listenerTimes.push(Date.now());
        }
      });

      await new Promise((resolve) => setTimeout(resolve, 100));

      // Perform burst updates (all at once)
      const numberOfUpdates = 25;
      const updatePromises = [];

      const burstStartTime = Date.now();

      for (let i = 1; i <= numberOfUpdates; i++) {
        updatePromises.push(
          assertSucceeds(
            updateDoc(songRef, {
              content: `{title: Burst Test}\n[C]Burst update ${i} [G]content`,
              burstCounter: i,
              updated_at: Timestamp.now(),
            })
          ).then(() => {
            updateTimes.push(Date.now());
          })
        );
      }

      await Promise.all(updatePromises);

      const burstEndTime = Date.now();
      const burstDuration = burstEndTime - burstStartTime;

      // Wait for listener updates
      await new Promise((resolve) => setTimeout(resolve, 1000));

      unsubscribe();

      // Performance assertions for burst scenario
      expect(burstDuration).toBeLessThan(PERFORMANCE_THRESHOLDS.MAX_BATCH_TIME);
      expect(updateTimes.length).toBe(numberOfUpdates);

      const burstThroughput = (numberOfUpdates / burstDuration) * 1000;
      expect(burstThroughput).toBeGreaterThan(
        PERFORMANCE_THRESHOLDS.MIN_THROUGHPUT
      );

      console.log('Burst Update Performance Metrics:', {
        totalUpdates: numberOfUpdates,
        burstDuration: `${burstDuration}ms`,
        burstThroughput: `${burstThroughput.toFixed(2)} updates/sec`,
        listenerUpdatesReceived: listenerTimes.length,
      });
    });

    it('should maintain performance under sustained load', async () => {
      const context = testEnv.authenticatedContext(USER_ID);
      const db = context.firestore();

      const songId = 'performance-song-sustained';
      const songRef = doc(db, 'songs', songId);

      const initialData = {
        title: 'Sustained Load Test',
        sustainedCounter: 0,
        user_id: USER_ID,
        created_at: Timestamp.now(),
        updated_at: Timestamp.now(),
      };

      await assertSucceeds(setDoc(songRef, initialData));

      const updateTimes: number[] = [];
      const listenerTimes: number[] = [];
      let receivedUpdates = 0;

      const unsubscribe = onSnapshot(songRef, (snapshot) => {
        if (snapshot.exists() && snapshot.data().sustainedCounter > 0) {
          listenerTimes.push(Date.now());
          receivedUpdates++;
        }
      });

      await new Promise((resolve) => setTimeout(resolve, 100));

      // Sustained updates over time
      const testDuration = 3000; // 3 seconds
      const updateInterval = 100; // Every 100ms
      const expectedUpdates = Math.floor(testDuration / updateInterval);

      let sustainedCounter = 0;
      const startTime = Date.now();

      const sustainedUpdateInterval = setInterval(async () => {
        if (Date.now() - startTime >= testDuration) {
          clearInterval(sustainedUpdateInterval);
          return;
        }

        sustainedCounter++;
        const updateStartTime = Date.now();

        try {
          await assertSucceeds(
            updateDoc(songRef, {
              content: `{title: Sustained Test}\n[C]Sustained ${sustainedCounter} [G]update`,
              sustainedCounter,
              updated_at: Timestamp.now(),
            })
          );

          updateTimes.push(Date.now());
        } catch (error) {
          console.error('Update failed:', error);
        }
      }, updateInterval);

      // Wait for test duration plus buffer
      await new Promise((resolve) => setTimeout(resolve, testDuration + 1000));

      clearInterval(sustainedUpdateInterval);
      unsubscribe();

      const actualDuration = Date.now() - startTime;
      const actualThroughput = (updateTimes.length / actualDuration) * 1000;

      // Performance assertions for sustained load
      expect(updateTimes.length).toBeGreaterThanOrEqual(expectedUpdates * 0.8); // Allow 20% tolerance
      expect(actualThroughput).toBeGreaterThan(
        PERFORMANCE_THRESHOLDS.MIN_THROUGHPUT
      );
      expect(receivedUpdates).toBeGreaterThan(0);

      console.log('Sustained Load Performance Metrics:', {
        duration: `${actualDuration}ms`,
        totalUpdates: updateTimes.length,
        expectedUpdates,
        throughput: `${actualThroughput.toFixed(2)} updates/sec`,
        listenerUpdatesReceived: receivedUpdates,
        successRate: `${((updateTimes.length / expectedUpdates) * 100).toFixed(1)}%`,
      });
    });
  });

  describe('Collection Update Performance', () => {
    it('should handle multiple document updates efficiently', async () => {
      const context = testEnv.authenticatedContext(USER_ID);
      const db = context.firestore();

      // Create multiple documents
      const numberOfDocs = 10;
      const docIds: string[] = [];

      for (let i = 1; i <= numberOfDocs; i++) {
        const docId = `perf-doc-${i}`;
        docIds.push(docId);

        await assertSucceeds(
          setDoc(doc(db, 'songs', docId), {
            title: `Performance Song ${i}`,
            counter: 0,
            user_id: USER_ID,
            created_at: Timestamp.now(),
            updated_at: Timestamp.now(),
          })
        );
      }

      // Set up collection listener
      const collectionQuery = query(
        collection(db, 'songs'),
        where('user_id', '==', USER_ID)
      );

      const collectionUpdates: number[] = [];
      const unsubscribe = onSnapshot(collectionQuery, (snapshot) => {
        collectionUpdates.push(Date.now());
      });

      await new Promise((resolve) => setTimeout(resolve, 200));

      // Update all documents rapidly
      const updateStartTime = Date.now();
      const updatePromises = [];

      for (const docId of docIds) {
        updatePromises.push(
          assertSucceeds(
            updateDoc(doc(db, 'songs', docId), {
              counter: 1,
              content: `{title: Performance Song}\n[C]Updated [G]content`,
              updated_at: Timestamp.now(),
            })
          )
        );
      }

      await Promise.all(updatePromises);

      const updateEndTime = Date.now();
      const updateDuration = updateEndTime - updateStartTime;

      // Wait for collection updates
      await new Promise((resolve) => setTimeout(resolve, 1000));

      unsubscribe();

      const collectionThroughput = (numberOfDocs / updateDuration) * 1000;

      // Performance assertions
      expect(updateDuration).toBeLessThan(
        PERFORMANCE_THRESHOLDS.MAX_BATCH_TIME
      );
      expect(collectionThroughput).toBeGreaterThan(
        PERFORMANCE_THRESHOLDS.MIN_THROUGHPUT
      );
      expect(collectionUpdates.length).toBeGreaterThanOrEqual(2); // Initial + at least one update

      console.log('Collection Update Performance Metrics:', {
        documentsUpdated: numberOfDocs,
        updateDuration: `${updateDuration}ms`,
        throughput: `${collectionThroughput.toFixed(2)} docs/sec`,
        collectionNotifications: collectionUpdates.length,
      });
    });

    it('should handle batch operations efficiently', async () => {
      const context = testEnv.authenticatedContext(USER_ID);
      const db = context.firestore();

      const numberOfDocs = 20;
      const batchStartTime = Date.now();

      // Create batch
      const batch = writeBatch(db);

      for (let i = 1; i <= numberOfDocs; i++) {
        const docRef = doc(db, 'songs', `batch-doc-${i}`);
        batch.set(docRef, {
          title: `Batch Song ${i}`,
          batchNumber: 1,
          user_id: USER_ID,
          created_at: Timestamp.now(),
          updated_at: Timestamp.now(),
        });
      }

      // Execute batch
      await assertSucceeds(batch.commit());

      const batchEndTime = Date.now();
      const batchDuration = batchEndTime - batchStartTime;

      // Set up listener to verify batch completion
      const collectionQuery = query(
        collection(db, 'songs'),
        where('user_id', '==', USER_ID),
        where('batchNumber', '==', 1)
      );

      const querySnapshot = await assertSucceeds(
        context.firestore().getDocs(collectionQuery)
      );

      const batchThroughput = (numberOfDocs / batchDuration) * 1000;

      // Performance assertions
      expect(batchDuration).toBeLessThan(PERFORMANCE_THRESHOLDS.MAX_BATCH_TIME);
      expect(querySnapshot.size).toBe(numberOfDocs);
      expect(batchThroughput).toBeGreaterThan(
        PERFORMANCE_THRESHOLDS.MIN_THROUGHPUT
      );

      console.log('Batch Operation Performance Metrics:', {
        documentsInBatch: numberOfDocs,
        batchDuration: `${batchDuration}ms`,
        throughput: `${batchThroughput.toFixed(2)} docs/sec`,
        documentsCreated: querySnapshot.size,
      });
    });
  });

  describe('Stress Testing', () => {
    it('should handle high-volume updates without degradation', async () => {
      const context = testEnv.authenticatedContext(USER_ID);
      const db = context.firestore();

      const songId = 'stress-test-song';
      const songRef = doc(db, 'songs', songId);

      const initialData = {
        title: 'Stress Test Song',
        stressCounter: 0,
        user_id: USER_ID,
        created_at: Timestamp.now(),
        updated_at: Timestamp.now(),
      };

      await assertSucceeds(setDoc(songRef, initialData));

      // Track performance over time
      const performanceWindows: PerformanceMetrics[] = [];
      let totalUpdates = 0;

      const windowSize = 20; // Updates per window
      const numberOfWindows = 5;

      for (let window = 1; window <= numberOfWindows; window++) {
        const windowStartTime = Date.now();
        const windowUpdateTimes: number[] = [];

        // Perform updates for this window
        for (let i = 1; i <= windowSize; i++) {
          totalUpdates++;

          const updateStart = Date.now();
          await assertSucceeds(
            updateDoc(songRef, {
              content: `{title: Stress Test}\n[C]Window ${window} Update ${i} [G]content`,
              stressCounter: totalUpdates,
              updated_at: Timestamp.now(),
            })
          );

          windowUpdateTimes.push(Date.now());

          // Small delay to maintain realistic load
          await new Promise((resolve) => setTimeout(resolve, 20));
        }

        // Calculate metrics for this window
        const windowMetrics = calculateMetrics(windowUpdateTimes, []);
        performanceWindows.push(windowMetrics);

        console.log(`Window ${window} Performance:`, {
          throughput: `${windowMetrics.throughput.toFixed(2)} updates/sec`,
          averageLatency: `${windowMetrics.averageLatency.toFixed(2)}ms`,
        });

        // Brief pause between windows
        await new Promise((resolve) => setTimeout(resolve, 100));
      }

      // Analyze performance degradation
      const firstWindowThroughput = performanceWindows[0].throughput;
      const lastWindowThroughput =
        performanceWindows[performanceWindows.length - 1].throughput;
      const performanceDegradation =
        (firstWindowThroughput - lastWindowThroughput) / firstWindowThroughput;

      // Performance assertions
      expect(performanceDegradation).toBeLessThan(0.5); // Less than 50% degradation
      expect(lastWindowThroughput).toBeGreaterThan(
        PERFORMANCE_THRESHOLDS.MIN_THROUGHPUT
      );

      performanceWindows.forEach((metrics, index) => {
        expect(metrics.averageLatency).toBeLessThan(
          PERFORMANCE_THRESHOLDS.MAX_AVERAGE_LATENCY
        );
        expect(metrics.maxLatency).toBeLessThan(
          PERFORMANCE_THRESHOLDS.MAX_SINGLE_UPDATE_LATENCY
        );
      });

      console.log('Stress Test Summary:', {
        totalUpdates,
        numberOfWindows,
        performanceDegradation: `${(performanceDegradation * 100).toFixed(1)}%`,
        averageThroughput: `${(performanceWindows.reduce((sum, m) => sum + m.throughput, 0) / performanceWindows.length).toFixed(2)} updates/sec`,
      });
    });
  });

  describe('Latency Measurements', () => {
    it('should measure end-to-end latency for real-time updates', async () => {
      const context1 = testEnv.authenticatedContext(USER_ID);
      const context2 = testEnv.authenticatedContext('listener-user');

      const db1 = context1.firestore();
      const db2 = context2.firestore();

      const songId = 'latency-test-song';
      const songRef1 = doc(db1, 'songs', songId);
      const songRef2 = doc(db2, 'songs', songId);

      const initialData = {
        title: 'Latency Test Song',
        latencyTestCounter: 0,
        updateTimestamp: Date.now(),
        user_id: USER_ID,
        created_at: Timestamp.now(),
        updated_at: Timestamp.now(),
      };

      await assertSucceeds(setDoc(songRef1, initialData));

      // Track latencies
      const latencies: number[] = [];
      const updateTimestamps: number[] = [];

      const unsubscribe = onSnapshot(songRef2, (snapshot) => {
        if (snapshot.exists()) {
          const data = snapshot.data();
          if (data.latencyTestCounter > 0) {
            const listenerTime = Date.now();
            const updateTime = data.updateTimestamp;
            const latency = listenerTime - updateTime;
            latencies.push(latency);
          }
        }
      });

      await new Promise((resolve) => setTimeout(resolve, 100));

      // Perform updates with timestamp tracking
      const numberOfLatencyTests = 15;

      for (let i = 1; i <= numberOfLatencyTests; i++) {
        const updateTimestamp = Date.now();
        updateTimestamps.push(updateTimestamp);

        await assertSucceeds(
          updateDoc(songRef1, {
            latencyTestCounter: i,
            updateTimestamp,
            content: `{title: Latency Test}\n[C]Update ${i} [G]for latency measurement`,
            updated_at: Timestamp.now(),
          })
        );

        // Wait between updates to get clean measurements
        await new Promise((resolve) => setTimeout(resolve, 200));
      }

      // Wait for all updates to propagate
      await new Promise((resolve) => setTimeout(resolve, 1000));

      unsubscribe();

      // Analyze latencies
      const validLatencies = latencies.filter((lat) => lat > 0 && lat < 10000); // Filter out outliers

      if (validLatencies.length > 0) {
        const averageLatency =
          validLatencies.reduce((a, b) => a + b, 0) / validLatencies.length;
        const maxLatency = Math.max(...validLatencies);
        const minLatency = Math.min(...validLatencies);
        const medianLatency = validLatencies.sort((a, b) => a - b)[
          Math.floor(validLatencies.length / 2)
        ];

        // Latency assertions
        expect(averageLatency).toBeLessThan(
          PERFORMANCE_THRESHOLDS.MAX_AVERAGE_LATENCY
        );
        expect(maxLatency).toBeLessThan(
          PERFORMANCE_THRESHOLDS.MAX_SINGLE_UPDATE_LATENCY
        );

        console.log('Latency Analysis:', {
          measurementCount: validLatencies.length,
          averageLatency: `${averageLatency.toFixed(2)}ms`,
          medianLatency: `${medianLatency.toFixed(2)}ms`,
          minLatency: `${minLatency.toFixed(2)}ms`,
          maxLatency: `${maxLatency.toFixed(2)}ms`,
          latencyDistribution: {
            under100ms: validLatencies.filter((l) => l < 100).length,
            under250ms: validLatencies.filter((l) => l < 250).length,
            under500ms: validLatencies.filter((l) => l < 500).length,
            over500ms: validLatencies.filter((l) => l >= 500).length,
          },
        });
      } else {
        console.warn('No valid latency measurements collected');
      }
    });
  });
});
