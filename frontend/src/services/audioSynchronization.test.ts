/**
 * Audio Synchronization Service Tests
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { AudioSynchronizationService } from './audioSynchronization';
import {
  SyncTimeline,
  ChordTimeMapping,
  AudioSyncConfig,
  AutoDetectionConfig,
  PlaybackMarker,
  LoopSection,
} from '../../types/audio';

describe('AudioSynchronizationService', () => {
  let syncService: AudioSynchronizationService;
  let mockTimeline: SyncTimeline;

  beforeEach(() => {
    syncService = new AudioSynchronizationService();
    
    // Create mock timeline
    mockTimeline = {
      id: 'test-timeline',
      audioSourceId: 'test-audio',
      chordMappings: [
        {
          id: 'chord-1',
          chordName: 'C',
          startTime: 0,
          endTime: 2,
          source: 'manual',
          verified: true,
        },
        {
          id: 'chord-2',
          chordName: 'Am',
          startTime: 2,
          endTime: 4,
          source: 'manual',
          verified: true,
        },
        {
          id: 'chord-3',
          chordName: 'F',
          startTime: 4,
          endTime: 6,
          source: 'automatic',
          verified: false,
          confidence: 0.8,
        },
      ],
      tempoMappings: [],
      markers: [
        {
          id: 'marker-1',
          time: 1,
          label: 'Verse 1',
          type: 'verse',
        },
      ],
      loopSections: [],
      metadata: {
        title: 'Test Song',
        duration: 60,
      },
      version: 1,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    // Configure sync
    const config: AudioSyncConfig = {
      enabled: true,
      tolerance: 50,
      autoHighlight: true,
      scrollSync: true,
      visualFeedback: true,
      practiceMode: false,
      playbackMarkers: [],
    };
    syncService.updateConfig(config);
  });

  afterEach(() => {
    syncService.destroy();
  });

  describe('Configuration Management', () => {
    it('should update sync configuration', () => {
      const newConfig: Partial<AudioSyncConfig> = {
        tolerance: 100,
        autoHighlight: false,
      };

      syncService.updateConfig(newConfig);
      const config = syncService.getConfig();

      expect(config.tolerance).toBe(100);
      expect(config.autoHighlight).toBe(false);
      expect(config.enabled).toBe(true); // Should preserve existing values
    });

    it('should enable/disable sync based on config', () => {
      syncService.updateConfig({ enabled: true });
      expect(syncService.getSyncState().isEnabled).toBe(true);

      syncService.updateConfig({ enabled: false });
      expect(syncService.getSyncState().isEnabled).toBe(false);
    });
  });

  describe('Timeline Management', () => {
    it('should load timeline', () => {
      const eventSpy = vi.fn();
      syncService.addEventListener('sync:timelineloaded', eventSpy);

      syncService.loadTimeline(mockTimeline);

      expect(syncService.getTimeline()).toEqual(mockTimeline);
      expect(eventSpy).toHaveBeenCalledWith({ timeline: mockTimeline });
    });

    it('should get loaded timeline', () => {
      expect(syncService.getTimeline()).toBeUndefined();

      syncService.loadTimeline(mockTimeline);
      expect(syncService.getTimeline()).toEqual(mockTimeline);
    });
  });

  describe('Synchronization Position Updates', () => {
    beforeEach(() => {
      syncService.loadTimeline(mockTimeline);
    });

    it('should update sync position and find current chord', () => {
      const chordChangeSpy = vi.fn();
      syncService.addEventListener('sync:chordchange', chordChangeSpy);

      // Position in first chord (0-2s)
      syncService.updateSyncPosition(1);

      expect(chordChangeSpy).toHaveBeenCalledWith({
        chord: mockTimeline.chordMappings[0],
        nextChord: mockTimeline.chordMappings[1],
      });
    });

    it('should handle chord transitions', () => {
      const chordChangeSpy = vi.fn();
      syncService.addEventListener('sync:chordchange', chordChangeSpy);

      // Move from first to second chord
      syncService.updateSyncPosition(1); // First chord
      syncService.updateSyncPosition(3); // Second chord

      expect(chordChangeSpy).toHaveBeenCalledTimes(2);
      expect(chordChangeSpy).toHaveBeenLastCalledWith({
        chord: mockTimeline.chordMappings[1],
        nextChord: mockTimeline.chordMappings[2],
      });
    });

    it('should respect tolerance when finding chords', () => {
      const chordChangeSpy = vi.fn();
      syncService.addEventListener('sync:chordchange', chordChangeSpy);

      // Position just before chord with tolerance
      syncService.updateSyncPosition(1.95); // 50ms before 2s transition

      expect(chordChangeSpy).toHaveBeenCalledWith({
        chord: mockTimeline.chordMappings[1], // Should find Am chord
        nextChord: mockTimeline.chordMappings[2],
      });
    });

    it('should handle markers during playback', () => {
      const markerSpy = vi.fn();
      syncService.addEventListener('sync:markerreached', markerSpy);

      syncService.updateSyncPosition(1); // Marker at 1s

      expect(markerSpy).toHaveBeenCalledWith({
        marker: mockTimeline.markers[0],
      });
    });

    it('should not update when sync is disabled', () => {
      const chordChangeSpy = vi.fn();
      syncService.addEventListener('sync:chordchange', chordChangeSpy);

      syncService.updateConfig({ enabled: false });
      syncService.updateSyncPosition(1);

      expect(chordChangeSpy).not.toHaveBeenCalled();
    });
  });

  describe('Chord Annotation', () => {
    beforeEach(() => {
      syncService.loadTimeline(mockTimeline);
    });

    it('should start annotation mode', () => {
      syncService.startAnnotation();
      // Note: In a real implementation, this would set internal state
      // We would need to expose an isAnnotating getter to test this properly
    });

    it('should add chord annotation', () => {
      const annotationSpy = vi.fn();
      syncService.addEventListener('sync:annotationadded', annotationSpy);

      const annotation = syncService.addChordAnnotation('G', 6, 8);

      expect(annotation.chordName).toBe('G');
      expect(annotation.startTime).toBe(6);
      expect(annotation.endTime).toBe(8);
      expect(annotation.source).toBe('manual');
      expect(annotation.verified).toBe(true);
      expect(annotation.id).toMatch(/^sync_/);

      expect(annotationSpy).toHaveBeenCalledWith({ annotation });

      // Check timeline was updated
      const timeline = syncService.getTimeline();
      expect(timeline?.chordMappings).toContain(annotation);
    });

    it('should update chord annotation', () => {
      const updateSpy = vi.fn();
      syncService.addEventListener('sync:annotationupdated', updateSpy);

      const annotation = syncService.addChordAnnotation('G', 6, 8);
      annotation.chordName = 'G7';
      annotation.endTime = 9;

      syncService.updateChordAnnotation(annotation);

      expect(updateSpy).toHaveBeenCalledWith({ annotation });

      // Check timeline was updated
      const timeline = syncService.getTimeline();
      const updated = timeline?.chordMappings.find(c => c.id === annotation.id);
      expect(updated?.chordName).toBe('G7');
      expect(updated?.endTime).toBe(9);
    });

    it('should remove chord annotation', () => {
      const removeSpy = vi.fn();
      syncService.addEventListener('sync:annotationremoved', removeSpy);

      const annotation = syncService.addChordAnnotation('G', 6, 8);
      const annotationId = annotation.id;

      syncService.removeChordAnnotation(annotationId);

      expect(removeSpy).toHaveBeenCalledWith({ annotationId });

      // Check timeline was updated
      const timeline = syncService.getTimeline();
      const found = timeline?.chordMappings.find(c => c.id === annotationId);
      expect(found).toBeUndefined();
    });

    it('should sort annotations by start time', () => {
      syncService.addChordAnnotation('G', 10, 12);
      syncService.addChordAnnotation('D', 8, 10);

      const timeline = syncService.getTimeline();
      const mappings = timeline?.chordMappings || [];

      // Should be sorted by start time
      expect(mappings[mappings.length - 2].startTime).toBeLessThan(
        mappings[mappings.length - 1].startTime
      );
    });
  });

  describe('Audio Analysis', () => {
    beforeEach(() => {
      syncService.loadTimeline(mockTimeline);
    });

    it('should analyze audio for chord detection', async () => {
      const analysisSpy = vi.fn();
      syncService.addEventListener('sync:analysiscomplete', analysisSpy);

      // Create mock audio buffer
      const mockAudioBuffer = {
        duration: 10,
        sampleRate: 44100,
        numberOfChannels: 2,
        length: 441000,
        getChannelData: vi.fn(() => new Float32Array(441000)),
      } as unknown as AudioBuffer;

      const config: AutoDetectionConfig = {
        enabled: true,
        method: 'combined',
        sensitivity: 0.7,
        minChordDuration: 0.5,
        maxChordDuration: 8.0,
        confidenceThreshold: 0.6,
        postProcessing: true,
      };

      const result = await syncService.analyzeAudio(mockAudioBuffer, config);

      expect(result.chordMappings).toBeDefined();
      expect(result.confidence).toBeGreaterThan(0);
      expect(result.method).toBe('combined');
      expect(result.duration).toBe(10);
      expect(result.sampleRate).toBe(44100);

      expect(analysisSpy).toHaveBeenCalledWith({ result });
    });

    it('should handle analysis errors', async () => {
      const errorSpy = vi.fn();
      syncService.addEventListener('sync:error', errorSpy);

      const config: AutoDetectionConfig = {
        enabled: false, // Disabled config should cause error
        method: 'combined',
        sensitivity: 0.7,
        minChordDuration: 0.5,
        maxChordDuration: 8.0,
        confidenceThreshold: 0.6,
        postProcessing: true,
      };

      const mockAudioBuffer = {} as AudioBuffer;

      await expect(
        syncService.analyzeAudio(mockAudioBuffer, config)
      ).rejects.toThrow();

      expect(errorSpy).toHaveBeenCalled();
    });
  });

  describe('Marker Management', () => {
    beforeEach(() => {
      syncService.loadTimeline(mockTimeline);
    });

    it('should add marker', () => {
      const marker: PlaybackMarker = {
        id: 'new-marker',
        time: 30,
        label: 'Bridge',
        type: 'bridge',
      };

      syncService.addMarker(marker);

      const timeline = syncService.getTimeline();
      expect(timeline?.markers).toContain(marker);
    });

    it('should remove marker', () => {
      const marker: PlaybackMarker = {
        id: 'temp-marker',
        time: 30,
        label: 'Temp',
        type: 'custom',
      };

      syncService.addMarker(marker);
      syncService.removeMarker(marker.id);

      const timeline = syncService.getTimeline();
      const found = timeline?.markers.find(m => m.id === marker.id);
      expect(found).toBeUndefined();
    });

    it('should sort markers by time', () => {
      const marker1: PlaybackMarker = {
        id: 'marker-2',
        time: 30,
        label: 'Later',
        type: 'custom',
      };
      const marker2: PlaybackMarker = {
        id: 'marker-3',
        time: 15,
        label: 'Earlier',
        type: 'custom',
      };

      syncService.addMarker(marker1);
      syncService.addMarker(marker2);

      const timeline = syncService.getTimeline();
      const markers = timeline?.markers || [];
      
      // Should be sorted by time
      for (let i = 1; i < markers.length; i++) {
        expect(markers[i - 1].time).toBeLessThanOrEqual(markers[i].time);
      }
    });
  });

  describe('Loop Section Management', () => {
    it('should set loop section', () => {
      const loop: LoopSection = {
        id: 'test-loop',
        name: 'Verse Loop',
        startTime: 10,
        endTime: 20,
        enabled: true,
        repeatCount: 3,
      };

      syncService.setLoopSection(loop);

      const config = syncService.getConfig();
      expect(config.loopSection).toEqual(loop);
    });

    it('should clear loop section', () => {
      const loop: LoopSection = {
        id: 'test-loop',
        name: 'Verse Loop',
        startTime: 10,
        endTime: 20,
        enabled: true,
      };

      syncService.setLoopSection(loop);
      syncService.clearLoopSection();

      const config = syncService.getConfig();
      expect(config.loopSection).toBeUndefined();
    });

    it('should handle loop events during playback', () => {
      const loopEndSpy = vi.fn();
      const loopStartSpy = vi.fn();
      syncService.addEventListener('sync:loopend', loopEndSpy);
      syncService.addEventListener('sync:loopstart', loopStartSpy);

      const loop: LoopSection = {
        id: 'test-loop',
        name: 'Verse Loop',
        startTime: 10,
        endTime: 20,
        enabled: true,
        repeatCount: 2,
      };

      syncService.updateConfig({ practiceMode: true, loopSection: loop });
      syncService.loadTimeline(mockTimeline);

      // Simulate reaching end of loop
      syncService.updateSyncPosition(20);

      expect(loopEndSpy).toHaveBeenCalledWith({ loop });
      expect(loopStartSpy).toHaveBeenCalledWith({ loop });
    });
  });

  describe('Data Export/Import', () => {
    beforeEach(() => {
      syncService.loadTimeline(mockTimeline);
    });

    it('should export timeline', () => {
      const exported = syncService.exportTimeline();

      expect(exported).toBeDefined();
      expect(exported?.id).toBe(mockTimeline.id);
      expect(exported?.version).toBe(mockTimeline.version + 1);
      expect(exported?.chordMappings.length).toBe(mockTimeline.chordMappings.length);
    });

    it('should import timeline', () => {
      const newTimeline: SyncTimeline = {
        ...mockTimeline,
        id: 'imported-timeline',
        chordMappings: [
          {
            id: 'imported-chord',
            chordName: 'Dm',
            startTime: 0,
            endTime: 2,
            source: 'imported',
            verified: true,
          },
        ],
      };

      syncService.importTimeline(newTimeline);

      const timeline = syncService.getTimeline();
      expect(timeline?.id).toBe('imported-timeline');
      expect(timeline?.chordMappings[0].chordName).toBe('Dm');
    });

    it('should validate timeline on import', () => {
      const invalidTimeline = {
        ...mockTimeline,
        id: '', // Invalid empty ID
      };

      expect(() => {
        syncService.importTimeline(invalidTimeline as SyncTimeline);
      }).toThrow('Invalid timeline: missing required fields');
    });

    it('should validate chord mappings on import', () => {
      const invalidTimeline = {
        ...mockTimeline,
        chordMappings: [
          {
            id: 'invalid-chord',
            chordName: 'C',
            startTime: 5,
            endTime: 2, // End before start - invalid
            source: 'manual',
            verified: true,
          },
        ],
      };

      expect(() => {
        syncService.importTimeline(invalidTimeline as SyncTimeline);
      }).toThrow('Invalid chord mapping: invalid-chord');
    });
  });

  describe('Event System', () => {
    it('should add and remove event listeners', () => {
      const listener = vi.fn();

      syncService.addEventListener('sync:chordchange', listener);
      syncService.removeEventListener('sync:chordchange', listener);

      // Should not be called after removal
      syncService.loadTimeline(mockTimeline);
      syncService.updateSyncPosition(1);

      expect(listener).not.toHaveBeenCalled();
    });

    it('should handle listener errors gracefully', () => {
      const errorListener = vi.fn(() => {
        throw new Error('Listener error');
      });
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      syncService.addEventListener('sync:chordchange', errorListener);
      syncService.loadTimeline(mockTimeline);
      syncService.updateSyncPosition(1);

      expect(errorListener).toHaveBeenCalled();
      expect(consoleErrorSpy).toHaveBeenCalled();

      consoleErrorSpy.mockRestore();
    });
  });

  describe('State Management', () => {
    it('should provide sync state', () => {
      const state = syncService.getSyncState();

      expect(state).toHaveProperty('isEnabled');
      expect(state).toHaveProperty('isHighlighting');
      expect(state).toHaveProperty('syncPosition');
      expect(state).toHaveProperty('lastSyncTime');
      expect(state).toHaveProperty('driftCompensation');
    });

    it('should update sync state during playback', () => {
      syncService.loadTimeline(mockTimeline);
      
      const initialState = syncService.getSyncState();
      expect(initialState.syncPosition).toBe(0);

      syncService.updateSyncPosition(5);
      
      const updatedState = syncService.getSyncState();
      expect(updatedState.syncPosition).toBe(5);
      expect(updatedState.lastSyncTime).toBeGreaterThan(initialState.lastSyncTime);
    });
  });

  describe('Cleanup', () => {
    it('should cleanup resources on destroy', () => {
      syncService.loadTimeline(mockTimeline);
      const timeline = syncService.getTimeline();
      expect(timeline).toBeDefined();

      syncService.destroy();

      const timelineAfterDestroy = syncService.getTimeline();
      expect(timelineAfterDestroy).toBeUndefined();

      const state = syncService.getSyncState();
      expect(state.isEnabled).toBe(false);
    });
  });
});