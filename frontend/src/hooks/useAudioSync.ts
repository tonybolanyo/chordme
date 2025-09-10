/**
 * React Hook for Audio Synchronization
 * Provides state management and controls for audio-chord synchronization
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import {
  SyncTimeline,
  ChordTimeMapping,
  PlaybackMarker,
  LoopSection,
  AudioSyncConfig,
  SyncState,
  AutoDetectionConfig,
  AudioAnalysisResult,
  AudioSource,
} from '../types/audio';
import { audioEngine } from '../services/audioEngine';

interface UseAudioSyncOptions {
  autoLoad?: boolean;
  enablePracticeMode?: boolean;
  defaultTolerance?: number;
}

interface UseAudioSyncReturn {
  // State
  syncState: SyncState | null;
  currentChord: ChordTimeMapping | null;
  nextChord: ChordTimeMapping | null;
  timeline: SyncTimeline | null;
  isAnnotating: boolean;
  analysisProgress: number;
  
  // Configuration
  syncConfig: AudioSyncConfig;
  updateSyncConfig: (config: Partial<AudioSyncConfig>) => void;
  
  // Timeline management
  loadTimeline: (timeline: SyncTimeline) => Promise<void>;
  createNewTimeline: (audioSource: AudioSource) => SyncTimeline;
  exportTimeline: () => SyncTimeline | null;
  importTimeline: (timeline: SyncTimeline) => Promise<void>;
  
  // Chord annotation
  startAnnotation: () => void;
  stopAnnotation: () => void;
  addChordAnnotation: (chordName: string, startTime?: number, endTime?: number) => void;
  updateChordAnnotation: (mapping: ChordTimeMapping) => void;
  removeChordAnnotation: (id: string) => void;
  
  // Markers and practice
  addMarker: (marker: PlaybackMarker) => void;
  removeMarker: (id: string) => void;
  setLoopSection: (loop: LoopSection) => void;
  clearLoopSection: () => void;
  
  // Auto-detection
  analyzeAudio: (config?: Partial<AutoDetectionConfig>) => Promise<AudioAnalysisResult>;
  
  // Playback controls with sync
  seekToChord: (chordId: string) => void;
  seekToMarker: (markerId: string) => void;
  togglePracticeMode: () => void;
}

const defaultSyncConfig: AudioSyncConfig = {
  enabled: false,
  tolerance: 50,
  autoHighlight: true,
  scrollSync: true,
  visualFeedback: true,
  practiceMode: false,
  playbackMarkers: [],
};

const defaultAutoDetectionConfig: AutoDetectionConfig = {
  enabled: true,
  method: 'combined',
  sensitivity: 0.7,
  minChordDuration: 0.5,
  maxChordDuration: 8.0,
  confidenceThreshold: 0.6,
  postProcessing: true,
};

export function useAudioSync(options: UseAudioSyncOptions = {}): UseAudioSyncReturn {
  const {
    autoLoad = false,
    enablePracticeMode = true,
    defaultTolerance = 50,
  } = options;

  // State
  const [syncState, setSyncState] = useState<SyncState | null>(null);
  const [currentChord, setCurrentChord] = useState<ChordTimeMapping | null>(null);
  const [nextChord, setNextChord] = useState<ChordTimeMapping | null>(null);
  const [timeline, setTimeline] = useState<SyncTimeline | null>(null);
  const [isAnnotating, setIsAnnotating] = useState(false);
  const [analysisProgress, setAnalysisProgress] = useState(0);
  const [syncConfig, setSyncConfig] = useState<AudioSyncConfig>({
    ...defaultSyncConfig,
    tolerance: defaultTolerance,
    practiceMode: enablePracticeMode,
  });

  // Refs
  const isInitializedRef = useRef(false);

  // Initialize sync system
  useEffect(() => {
    if (isInitializedRef.current) return;
    isInitializedRef.current = true;

    // Set up event listeners
    const handleChordChange = (event: unknown) => {
      setCurrentChord(event.chord);
      setNextChord(event.nextChord || null);
    };

    const handleMarkerReached = (event: unknown) => {
      // Handle marker events if needed
      console.log('Marker reached:', event.marker);
    };

    const handleLoopStart = (event: unknown) => {
      console.log('Loop started:', event.loop);
    };

    const handleLoopEnd = (event: unknown) => {
      console.log('Loop ended:', event.loop);
    };

    const handleTimelineLoaded = (event: unknown) => {
      setTimeline(event.timeline);
    };

    const handleAnnotationAdded = (event: unknown) => {
      // Update timeline state if needed
      updateTimelineState();
    };

    const handleAnnotationUpdated = (event: unknown) => {
      updateTimelineState();
    };

    const handleAnnotationRemoved = (event: unknown) => {
      updateTimelineState();
    };

    const handleAnalysisComplete = (event: unknown) => {
      setAnalysisProgress(100);
      // Auto-add detected chords to timeline
      const result: AudioAnalysisResult = event.result;
      result.chordMappings.forEach((mapping) => {
        audioEngine.addChordMapping(mapping);
      });
      updateTimelineState();
    };

    const handleSyncError = (event: unknown) => {
      console.error('Sync error:', event.error);
      setAnalysisProgress(0);
    };

    // Add event listeners
    audioEngine.addEventListener('sync:chordchange', handleChordChange);
    audioEngine.addEventListener('sync:markerreached', handleMarkerReached);
    audioEngine.addEventListener('sync:loopstart', handleLoopStart);
    audioEngine.addEventListener('sync:loopend', handleLoopEnd);
    audioEngine.addEventListener('sync:timelineloaded', handleTimelineLoaded);
    audioEngine.addEventListener('sync:annotationadded', handleAnnotationAdded);
    audioEngine.addEventListener('sync:annotationupdated', handleAnnotationUpdated);
    audioEngine.addEventListener('sync:annotationremoved', handleAnnotationRemoved);
    audioEngine.addEventListener('sync:analysiscomplete', handleAnalysisComplete);
    audioEngine.addEventListener('sync:error', handleSyncError);

    // Update sync state periodically
    const stateUpdateInterval = setInterval(() => {
      setSyncState(audioEngine.getSyncState());
    }, 100);

    // Enable sync with initial config
    audioEngine.enableSync(syncConfig);

    return () => {
      // Cleanup event listeners
      audioEngine.removeEventListener('sync:chordchange', handleChordChange);
      audioEngine.removeEventListener('sync:markerreached', handleMarkerReached);
      audioEngine.removeEventListener('sync:loopstart', handleLoopStart);
      audioEngine.removeEventListener('sync:loopend', handleLoopEnd);
      audioEngine.removeEventListener('sync:timelineloaded', handleTimelineLoaded);
      audioEngine.removeEventListener('sync:annotationadded', handleAnnotationAdded);
      audioEngine.removeEventListener('sync:annotationupdated', handleAnnotationUpdated);
      audioEngine.removeEventListener('sync:annotationremoved', handleAnnotationRemoved);
      audioEngine.removeEventListener('sync:analysiscomplete', handleAnalysisComplete);
      audioEngine.removeEventListener('sync:error', handleSyncError);
      
      clearInterval(stateUpdateInterval);
    };
  }, [syncConfig]);

  // Update timeline state helper
  const updateTimelineState = useCallback(() => {
    try {
      const exportedTimeline = audioEngine.exportSyncData();
      setTimeline(exportedTimeline);
    } catch (error) {
      // Timeline might not be available yet
    }
  }, []);

  // Configuration management
  const updateSyncConfig = useCallback((config: Partial<AudioSyncConfig>) => {
    const newConfig = { ...syncConfig, ...config };
    setSyncConfig(newConfig);
    audioEngine.enableSync(newConfig);
  }, [syncConfig]);

  // Timeline management
  const loadTimeline = useCallback(async (timelineData: SyncTimeline) => {
    try {
      await audioEngine.loadSyncTimeline(timelineData);
      setTimeline(timelineData);
    } catch (error) {
      console.error('Failed to load timeline:', error);
      throw error;
    }
  }, []);

  const createNewTimeline = useCallback((audioSource: AudioSource): SyncTimeline => {
    const newTimeline: SyncTimeline = {
      id: `timeline_${Date.now()}`,
      audioSourceId: audioSource.id,
      chordMappings: [],
      tempoMappings: [],
      markers: [],
      loopSections: [],
      metadata: {
        title: audioSource.title,
        artist: audioSource.artist,
        duration: audioSource.duration || 0,
      },
      version: 1,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    setTimeline(newTimeline);
    return newTimeline;
  }, []);

  const exportTimeline = useCallback((): SyncTimeline | null => {
    try {
      return audioEngine.exportSyncData();
    } catch (error) {
      console.error('Failed to export timeline:', error);
      return null;
    }
  }, []);

  const importTimeline = useCallback(async (timelineData: SyncTimeline) => {
    try {
      await audioEngine.importSyncData(timelineData);
      setTimeline(timelineData);
    } catch (error) {
      console.error('Failed to import timeline:', error);
      throw error;
    }
  }, []);

  // Chord annotation
  const startAnnotation = useCallback(() => {
    audioEngine.startChordAnnotation();
    setIsAnnotating(true);
  }, []);

  const stopAnnotation = useCallback(() => {
    audioEngine.stopChordAnnotation();
    setIsAnnotating(false);
  }, []);

  const addChordAnnotation = useCallback((
    chordName: string,
    startTime?: number,
    endTime?: number
  ) => {
    const mapping: ChordTimeMapping = {
      id: `chord_${Date.now()}`,
      chordName,
      startTime: startTime ?? audioEngine.getState().currentTime,
      endTime: endTime ?? audioEngine.getState().currentTime + 2,
      source: 'manual',
      verified: true,
    };
    audioEngine.addChordMapping(mapping);
  }, []);

  const updateChordAnnotation = useCallback((mapping: ChordTimeMapping) => {
    audioEngine.updateChordMapping(mapping);
  }, []);

  const removeChordAnnotation = useCallback((id: string) => {
    audioEngine.removeChordMapping(id);
  }, []);

  // Markers and practice
  const addMarker = useCallback((marker: PlaybackMarker) => {
    audioEngine.addPlaybackMarker(marker);
    updateTimelineState();
  }, [updateTimelineState]);

  const removeMarker = useCallback((id: string) => {
    audioEngine.removePlaybackMarker(id);
    updateTimelineState();
  }, [updateTimelineState]);

  const setLoopSection = useCallback((loop: LoopSection) => {
    audioEngine.setLoopSection(loop);
    updateSyncConfig({ loopSection: loop });
  }, [updateSyncConfig]);

  const clearLoopSection = useCallback(() => {
    audioEngine.clearLoopSection();
    updateSyncConfig({ loopSection: undefined });
  }, [updateSyncConfig]);

  // Auto-detection
  const analyzeAudio = useCallback(async (
    config: Partial<AutoDetectionConfig> = {}
  ): Promise<AudioAnalysisResult> => {
    const analysisConfig = { ...defaultAutoDetectionConfig, ...config };
    setAnalysisProgress(10);
    
    try {
      const result = await audioEngine.analyzeAudioForChords(analysisConfig);
      setAnalysisProgress(100);
      return result;
    } catch (error) {
      setAnalysisProgress(0);
      throw error;
    }
  }, []);

  // Playback controls with sync
  const seekToChord = useCallback((chordId: string) => {
    if (!timeline) return;
    
    const chord = timeline.chordMappings.find(c => c.id === chordId);
    if (chord) {
      audioEngine.seek(chord.startTime);
    }
  }, [timeline]);

  const seekToMarker = useCallback((markerId: string) => {
    if (!timeline) return;
    
    const marker = timeline.markers.find(m => m.id === markerId);
    if (marker) {
      audioEngine.seek(marker.time);
    }
  }, [timeline]);

  const togglePracticeMode = useCallback(() => {
    updateSyncConfig({ practiceMode: !syncConfig.practiceMode });
  }, [syncConfig.practiceMode, updateSyncConfig]);

  return {
    // State
    syncState,
    currentChord,
    nextChord,
    timeline,
    isAnnotating,
    analysisProgress,
    
    // Configuration
    syncConfig,
    updateSyncConfig,
    
    // Timeline management
    loadTimeline,
    createNewTimeline,
    exportTimeline,
    importTimeline,
    
    // Chord annotation
    startAnnotation,
    stopAnnotation,
    addChordAnnotation,
    updateChordAnnotation,
    removeChordAnnotation,
    
    // Markers and practice
    addMarker,
    removeMarker,
    setLoopSection,
    clearLoopSection,
    
    // Auto-detection
    analyzeAudio,
    
    // Playback controls with sync
    seekToChord,
    seekToMarker,
    togglePracticeMode,
  };
}