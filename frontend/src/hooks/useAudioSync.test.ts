/**
 * useAudioSync Hook Tests
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useAudioSync } from './useAudioSync';
import { audioEngine } from '../../services/audioEngine';
import { AudioSource, SyncTimeline, ChordTimeMapping } from '../../types/audio';

// Mock the audio engine
vi.mock('../../services/audioEngine', () => ({
  audioEngine: {
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    loadSyncTimeline: vi.fn().mockResolvedValue(undefined),
    getSyncState: vi.fn(() => ({
      isEnabled: true,
      isHighlighting: false,
      syncPosition: 0,
      lastSyncTime: Date.now(),
      driftCompensation: 0,
    })),
    enableSync: vi.fn(),
    startChordAnnotation: vi.fn(),
    stopChordAnnotation: vi.fn(),
    addChordMapping: vi.fn(),
    updateChordMapping: vi.fn(),
    removeChordMapping: vi.fn(),
    addPlaybackMarker: vi.fn(),
    removePlaybackMarker: vi.fn(),
    setLoopSection: vi.fn(),
    clearLoopSection: vi.fn(),
    analyzeAudioForChords: vi.fn(),
    exportSyncData: vi.fn(),
    importSyncData: vi.fn().mockResolvedValue(undefined),
    getState: vi.fn(() => ({ currentTime: 0 })),
    seek: vi.fn(),
  },
}));

describe('useAudioSync', () => {
  const mockAudioSource: AudioSource = {
    id: 'test-audio',
    url: 'test-audio.mp3',
    title: 'Test Song',
    artist: 'Test Artist',
    duration: 120,
    format: 'mp3',
    quality: 'high',
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('Basic Hook Functionality', () => {
    it('should initialize with default values', () => {
      const { result } = renderHook(() => useAudioSync());

      expect(result.current.syncState).toBeNull();
      expect(result.current.currentChord).toBeNull();
      expect(result.current.nextChord).toBeNull();
      expect(result.current.timeline).toBeNull();
      expect(result.current.isAnnotating).toBe(false);
      expect(result.current.analysisProgress).toBe(0);
    });

    it('should set up event listeners on mount', () => {
      renderHook(() => useAudioSync());

      expect(audioEngine.addEventListener).toHaveBeenCalledWith(
        'sync:chordchange',
        expect.any(Function)
      );
      expect(audioEngine.addEventListener).toHaveBeenCalledWith(
        'sync:timelineloaded',
        expect.any(Function)
      );
      expect(audioEngine.enableSync).toHaveBeenCalled();
    });

    it('should clean up event listeners on unmount', () => {
      const { unmount } = renderHook(() => useAudioSync());

      unmount();

      expect(audioEngine.removeEventListener).toHaveBeenCalledWith(
        'sync:chordchange',
        expect.any(Function)
      );
    });
  });

  describe('Configuration Management', () => {
    it('should update sync configuration', () => {
      const { result } = renderHook(() => useAudioSync());

      act(() => {
        result.current.updateSyncConfig({
          tolerance: 100,
          autoHighlight: false,
        });
      });

      expect(result.current.syncConfig.tolerance).toBe(100);
      expect(result.current.syncConfig.autoHighlight).toBe(false);
      expect(audioEngine.enableSync).toHaveBeenLastCalledWith(
        expect.objectContaining({
          tolerance: 100,
          autoHighlight: false,
        })
      );
    });

    it('should use default configuration options', () => {
      const { result } = renderHook(() =>
        useAudioSync({
          defaultTolerance: 75,
          enablePracticeMode: false,
        })
      );

      expect(result.current.syncConfig.tolerance).toBe(75);
      expect(result.current.syncConfig.practiceMode).toBe(false);
    });
  });

  describe('Timeline Management', () => {
    const mockTimeline: SyncTimeline = {
      id: 'test-timeline',
      audioSourceId: 'test-audio',
      chordMappings: [],
      tempoMappings: [],
      markers: [],
      loopSections: [],
      metadata: { title: 'Test', duration: 120 },
      version: 1,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    it('should load timeline', async () => {
      const { result } = renderHook(() => useAudioSync());

      await act(async () => {
        await result.current.loadTimeline(mockTimeline);
      });

      expect(audioEngine.loadSyncTimeline).toHaveBeenCalledWith(mockTimeline);
    });

    it('should create new timeline from audio source', () => {
      const { result } = renderHook(() => useAudioSync());

      act(() => {
        const timeline = result.current.createNewTimeline(mockAudioSource);
        expect(timeline.audioSourceId).toBe(mockAudioSource.id);
        expect(timeline.metadata.title).toBe(mockAudioSource.title);
        expect(timeline.metadata.artist).toBe(mockAudioSource.artist);
        expect(timeline.metadata.duration).toBe(mockAudioSource.duration);
      });
    });

    it('should export timeline', () => {
      const mockExportedTimeline = { ...mockTimeline, version: 2 };
      vi.mocked(audioEngine.exportSyncData).mockReturnValue(mockExportedTimeline);

      const { result } = renderHook(() => useAudioSync());

      act(() => {
        const exported = result.current.exportTimeline();
        expect(exported).toEqual(mockExportedTimeline);
      });

      expect(audioEngine.exportSyncData).toHaveBeenCalled();
    });

    it('should import timeline', async () => {
      const { result } = renderHook(() => useAudioSync());

      await act(async () => {
        await result.current.importTimeline(mockTimeline);
      });

      expect(audioEngine.importSyncData).toHaveBeenCalledWith(mockTimeline);
    });

    it('should handle timeline loading errors', async () => {
      vi.mocked(audioEngine.loadSyncTimeline).mockRejectedValue(
        new Error('Load failed')
      );

      const { result } = renderHook(() => useAudioSync());

      await expect(
        act(async () => {
          await result.current.loadTimeline(mockTimeline);
        })
      ).rejects.toThrow('Load failed');
    });
  });

  describe('Event Handling', () => {
    it('should handle chord change events', () => {
      const mockChord: ChordTimeMapping = {
        id: 'chord-1',
        chordName: 'C',
        startTime: 0,
        endTime: 2,
        source: 'manual',
        verified: true,
      };

      const nextChord: ChordTimeMapping = {
        id: 'chord-2',
        chordName: 'Am',
        startTime: 2,
        endTime: 4,
        source: 'manual',
        verified: true,
      };

      const { result } = renderHook(() => useAudioSync());

      // Simulate chord change event
      const chordChangeHandler = vi.mocked(audioEngine.addEventListener).mock.calls
        .find(([event]) => event === 'sync:chordchange')?.[1];

      act(() => {
        chordChangeHandler?.({ chord: mockChord, nextChord });
      });

      expect(result.current.currentChord).toEqual(mockChord);
      expect(result.current.nextChord).toEqual(nextChord);
    });

    it('should handle analysis complete events', () => {
      const { result } = renderHook(() => useAudioSync());

      // Simulate analysis complete event
      const analysisHandler = vi.mocked(audioEngine.addEventListener).mock.calls
        .find(([event]) => event === 'sync:analysiscomplete')?.[1];

      act(() => {
        analysisHandler?.({
          result: {
            chordMappings: [],
            confidence: 0.8,
            analysisTime: 100,
            method: 'combined',
            sampleRate: 44100,
            duration: 10,
          },
        });
      });

      expect(result.current.analysisProgress).toBe(100);
    });

    it('should handle sync errors', () => {
      const { result } = renderHook(() => useAudioSync());

      // Simulate sync error event
      const errorHandler = vi.mocked(audioEngine.addEventListener).mock.calls
        .find(([event]) => event === 'sync:error')?.[1];

      act(() => {
        errorHandler?.({
          error: {
            code: 'SYNC_ANALYSIS_FAILED',
            message: 'Analysis failed',
            timestamp: new Date(),
            context: 'analysis',
            recoverable: true,
          },
        });
      });

      expect(result.current.analysisProgress).toBe(0);
    });
  });

  describe('Chord Annotation', () => {
    it('should start annotation', () => {
      const { result } = renderHook(() => useAudioSync());

      act(() => {
        result.current.startAnnotation();
      });

      expect(audioEngine.startChordAnnotation).toHaveBeenCalled();
      expect(result.current.isAnnotating).toBe(true);
    });

    it('should stop annotation', () => {
      const { result } = renderHook(() => useAudioSync());

      act(() => {
        result.current.startAnnotation();
        result.current.stopAnnotation();
      });

      expect(audioEngine.stopChordAnnotation).toHaveBeenCalled();
      expect(result.current.isAnnotating).toBe(false);
    });

    it('should add chord annotation', () => {
      vi.mocked(audioEngine.getState).mockReturnValue({ currentTime: 5 } as any);

      const { result } = renderHook(() => useAudioSync());

      act(() => {
        result.current.addChordAnnotation('G');
      });

      expect(audioEngine.addChordMapping).toHaveBeenCalledWith(
        expect.objectContaining({
          chordName: 'G',
          startTime: 5,
          endTime: 7, // currentTime + 2
          source: 'manual',
          verified: true,
        })
      );
    });

    it('should update chord annotation', () => {
      const mockAnnotation: ChordTimeMapping = {
        id: 'chord-1',
        chordName: 'C',
        startTime: 0,
        endTime: 2,
        source: 'manual',
        verified: true,
      };

      const { result } = renderHook(() => useAudioSync());

      act(() => {
        result.current.updateChordAnnotation(mockAnnotation);
      });

      expect(audioEngine.updateChordMapping).toHaveBeenCalledWith(mockAnnotation);
    });

    it('should remove chord annotation', () => {
      const { result } = renderHook(() => useAudioSync());

      act(() => {
        result.current.removeChordAnnotation('chord-1');
      });

      expect(audioEngine.removeChordMapping).toHaveBeenCalledWith('chord-1');
    });
  });

  describe('Markers and Practice Mode', () => {
    it('should add marker', () => {
      const mockMarker = {
        id: 'marker-1',
        time: 10,
        label: 'Verse',
        type: 'verse' as const,
      };

      const { result } = renderHook(() => useAudioSync());

      act(() => {
        result.current.addMarker(mockMarker);
      });

      expect(audioEngine.addPlaybackMarker).toHaveBeenCalledWith(mockMarker);
    });

    it('should remove marker', () => {
      const { result } = renderHook(() => useAudioSync());

      act(() => {
        result.current.removeMarker('marker-1');
      });

      expect(audioEngine.removePlaybackMarker).toHaveBeenCalledWith('marker-1');
    });

    it('should set loop section', () => {
      const mockLoop = {
        id: 'loop-1',
        name: 'Verse Loop',
        startTime: 10,
        endTime: 20,
        enabled: true,
      };

      const { result } = renderHook(() => useAudioSync());

      act(() => {
        result.current.setLoopSection(mockLoop);
      });

      expect(audioEngine.setLoopSection).toHaveBeenCalledWith(mockLoop);
    });

    it('should clear loop section', () => {
      const { result } = renderHook(() => useAudioSync());

      act(() => {
        result.current.clearLoopSection();
      });

      expect(audioEngine.clearLoopSection).toHaveBeenCalled();
    });

    it('should toggle practice mode', () => {
      const { result } = renderHook(() => useAudioSync());

      const initialPracticeMode = result.current.syncConfig.practiceMode;

      act(() => {
        result.current.togglePracticeMode();
      });

      expect(result.current.syncConfig.practiceMode).toBe(!initialPracticeMode);
    });
  });

  describe('Audio Analysis', () => {
    it('should analyze audio', async () => {
      const mockResult = {
        chordMappings: [],
        confidence: 0.8,
        analysisTime: 100,
        method: 'combined',
        sampleRate: 44100,
        duration: 10,
      };

      vi.mocked(audioEngine.analyzeAudioForChords).mockResolvedValue(mockResult);

      const { result } = renderHook(() => useAudioSync());

      let analysisResult;
      await act(async () => {
        analysisResult = await result.current.analyzeAudio();
      });

      expect(analysisResult).toEqual(mockResult);
      expect(result.current.analysisProgress).toBe(100);
    });

    it('should handle analysis errors', async () => {
      vi.mocked(audioEngine.analyzeAudioForChords).mockRejectedValue(
        new Error('Analysis failed')
      );

      const { result } = renderHook(() => useAudioSync());

      await expect(
        act(async () => {
          await result.current.analyzeAudio();
        })
      ).rejects.toThrow('Analysis failed');

      expect(result.current.analysisProgress).toBe(0);
    });

    it('should accept custom analysis config', async () => {
      const customConfig = {
        sensitivity: 0.9,
        method: 'chroma' as const,
      };

      const { result } = renderHook(() => useAudioSync());

      await act(async () => {
        await result.current.analyzeAudio(customConfig);
      });

      expect(audioEngine.analyzeAudioForChords).toHaveBeenCalledWith(
        expect.objectContaining({
          sensitivity: 0.9,
          method: 'chroma',
        })
      );
    });
  });

  describe('Playback Controls', () => {
    const mockTimeline: SyncTimeline = {
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
      ],
      tempoMappings: [],
      markers: [
        {
          id: 'marker-1',
          time: 10,
          label: 'Verse',
          type: 'verse',
        },
      ],
      loopSections: [],
      metadata: { title: 'Test', duration: 120 },
      version: 1,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    it('should seek to chord', () => {
      const { result } = renderHook(() => useAudioSync());

      act(() => {
        result.current.timeline = mockTimeline;
        result.current.seekToChord('chord-1');
      });

      expect(audioEngine.seek).toHaveBeenCalledWith(0);
    });

    it('should seek to marker', () => {
      const { result } = renderHook(() => useAudioSync());

      act(() => {
        result.current.timeline = mockTimeline;
        result.current.seekToMarker('marker-1');
      });

      expect(audioEngine.seek).toHaveBeenCalledWith(10);
    });

    it('should handle seeking to non-existent chord', () => {
      const { result } = renderHook(() => useAudioSync());

      act(() => {
        result.current.timeline = mockTimeline;
        result.current.seekToChord('non-existent');
      });

      expect(audioEngine.seek).not.toHaveBeenCalled();
    });

    it('should handle seeking without timeline', () => {
      const { result } = renderHook(() => useAudioSync());

      act(() => {
        result.current.seekToChord('chord-1');
      });

      expect(audioEngine.seek).not.toHaveBeenCalled();
    });
  });

  describe('State Updates', () => {
    it('should update sync state periodically', async () => {
      const mockSyncState = {
        isEnabled: true,
        isHighlighting: true,
        syncPosition: 5,
        lastSyncTime: Date.now(),
        driftCompensation: 0,
      };

      vi.mocked(audioEngine.getSyncState).mockReturnValue(mockSyncState);

      const { result } = renderHook(() => useAudioSync());

      // Wait for state update interval
      await waitFor(() => {
        expect(result.current.syncState).toEqual(mockSyncState);
      });
    });

    it('should update timeline state when annotations change', () => {
      const mockExportedTimeline: SyncTimeline = {
        id: 'updated-timeline',
        audioSourceId: 'test-audio',
        chordMappings: [
          {
            id: 'new-chord',
            chordName: 'G',
            startTime: 5,
            endTime: 7,
            source: 'manual',
            verified: true,
          },
        ],
        tempoMappings: [],
        markers: [],
        loopSections: [],
        metadata: { title: 'Test', duration: 120 },
        version: 2,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      vi.mocked(audioEngine.exportSyncData).mockReturnValue(mockExportedTimeline);

      const { result } = renderHook(() => useAudioSync());

      // Simulate annotation added event
      const annotationHandler = vi.mocked(audioEngine.addEventListener).mock.calls
        .find(([event]) => event === 'sync:annotationadded')?.[1];

      act(() => {
        annotationHandler?.({ annotation: mockExportedTimeline.chordMappings[0] });
      });

      expect(result.current.timeline).toEqual(mockExportedTimeline);
    });
  });
});