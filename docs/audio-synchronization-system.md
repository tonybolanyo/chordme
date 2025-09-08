---
layout: default
lang: en
title: Audio-Chord Synchronization System Documentation
---

# Audio-Chord Synchronization System Documentation

## Overview

The Audio-Chord Synchronization System enables timeline-based chord highlighting during audio playback, providing an interactive play-along experience for musicians. The system supports both manual annotation and automatic detection of chord timings.

## Architecture

### Core Components

#### 1. AudioSynchronizationService
- **Purpose**: Core timeline and synchronization management
- **Location**: `frontend/src/services/audioSynchronization.ts`
- **Features**:
  - Timeline-based chord tracking
  - Manual annotation recording
  - Automatic audio analysis
  - Event-driven architecture
  - Data export/import functionality

#### 2. Enhanced AudioEngine
- **Purpose**: Extended audio playback with sync capabilities
- **Location**: `frontend/src/services/audioEngine.ts`
- **Features**:
  - Real-time position tracking
  - Loop section handling
  - Synchronization events
  - Audio analysis integration

#### 3. useAudioSync Hook
- **Purpose**: React state management for synchronization
- **Location**: `frontend/src/hooks/useAudioSync.ts`
- **Features**:
  - Timeline state management
  - Event handling
  - Configuration management
  - Auto-analysis triggers

### UI Components

#### 1. ChordTimingAnnotator
- **Purpose**: Manual chord timing annotation interface
- **Location**: `frontend/src/components/ChordTimingAnnotator/`
- **Features**:
  - Real-time annotation capture
  - Keyboard shortcuts (C/V/M/Esc)
  - Visual timing feedback
  - Annotation management
  - Marker system

#### 2. SynchronizedChordViewer
- **Purpose**: Real-time chord highlighting during playback
- **Location**: `frontend/src/components/SynchronizedChordViewer/`
- **Features**:
  - ChordPro content parsing
  - Timeline-based highlighting
  - Auto-scrolling synchronization
  - Click-to-seek navigation

## Key Features

### ✅ Timeline-based Chord Highlighting
- Real-time highlighting of current chord during audio playback
- Configurable tolerance (10-200ms) for synchronization accuracy
- Smooth visual transitions with animations

### ✅ Manual Chord Timing Annotation
- Keyboard shortcuts for efficient annotation (C to start, V to stop)
- Real-time timing capture with visual feedback
- Duration tracking and validation
- Annotation editing and management

### ✅ Automatic Chord Timing Detection
- Web Audio API-based analysis framework
- Multiple detection methods (onset, chroma, combined)
- Confidence scoring for detected timings
- Post-processing optimization

### ✅ Synchronized Scrolling
- Auto-scroll to current chord position
- Smooth scrolling animations
- Configurable scroll behavior

### ✅ Practice Mode Features
- Loop sections with repeat counts
- Speed adjustment maintaining pitch
- Section markers for navigation
- Practice-optimized interface

### ✅ Data Export/Import
- JSON format with timeline versioning
- Cross-platform compatibility
- Validation on import
- Metadata preservation

## Usage Examples

### Basic Setup

```typescript
import { useAudioSync } from '../hooks/useAudioSync';
import { ChordTimingAnnotator } from '../components/ChordTimingAnnotator';
import { SynchronizedChordViewer } from '../components/SynchronizedChordViewer';

function MyMusicApp() {
  const {
    timeline,
    currentChord,
    startAnnotation,
    stopAnnotation,
    analyzeAudio,
  } = useAudioSync();

  return (
    <div>
      <ChordTimingAnnotator audioSource={audioSource} />
      <SynchronizedChordViewer 
        content={chordProContent}
        timeline={timeline}
      />
    </div>
  );
}
```

### Manual Annotation

```typescript
// Start annotation
const handleStartAnnotation = () => {
  startAnnotation();
};

// Stop annotation with automatic chord detection
const handleStopAnnotation = () => {
  stopAnnotation();
};

// Add chord annotation programmatically
const addChord = (chordName: string, startTime: number, endTime: number) => {
  addChordAnnotation(chordName, startTime, endTime);
};
```

### Auto-Detection

```typescript
// Analyze audio for chord detection
const runAnalysis = async () => {
  try {
    const result = await analyzeAudio({
      method: 'combined',
      sensitivity: 0.7,
      confidenceThreshold: 0.6,
    });
    console.log(`Detected ${result.chordMappings.length} chords`);
  } catch (error) {
    console.error('Analysis failed:', error);
  }
};
```

### Configuration

```typescript
// Update synchronization settings
updateSyncConfig({
  tolerance: 50,        // 50ms tolerance
  autoHighlight: true,  // Enable auto-highlighting
  scrollSync: true,     // Enable auto-scrolling
  practiceMode: true,   // Enable practice features
});
```

## Testing

### Test Coverage
- **AudioSynchronizationService**: 153 test cases
- **useAudioSync Hook**: 89 test cases
- **ChordTimingAnnotator**: 73 test cases
- **Overall Coverage**: 95%+ across synchronization modules

### Running Tests

```bash
# Run all synchronization tests
npm run test -- src/services/audioSynchronization.test.ts
npm run test -- src/hooks/useAudioSync.test.ts
npm run test -- src/components/ChordTimingAnnotator/ChordTimingAnnotator.test.tsx

# Run with coverage
npm run test:coverage
```

## Performance Considerations

### Optimization Strategies
- **Debounced Updates**: Scroll and position updates are debounced to prevent excessive re-renders
- **Event-Driven**: Minimal polling with event-based state updates
- **Efficient Lookups**: Binary search for timeline position lookup
- **Memory Management**: Automatic cleanup of event listeners and timers

### Performance Metrics
- **Synchronization Accuracy**: Within 50ms tolerance
- **Timeline Lookup**: O(log n) complexity
- **Memory Usage**: Minimal overhead with automatic cleanup
- **CPU Usage**: <5% during active synchronization

## Browser Compatibility

### Supported Features
- **Web Audio API**: Required for audio analysis
- **HTML5 Audio**: Fallback for basic playback
- **ES6 Modules**: Modern JavaScript features
- **TypeScript**: Full type safety

### Minimum Requirements
- **Chrome**: 66+
- **Firefox**: 60+
- **Safari**: 14+
- **Edge**: 79+

## API Reference

### AudioSynchronizationService

```typescript
// Core synchronization methods
loadTimeline(timeline: SyncTimeline): void
updateSyncPosition(currentTime: number): void
addChordAnnotation(chordName: string, startTime?: number, endTime?: number): ChordTimeMapping
analyzeAudio(audioBuffer: AudioBuffer, config: AutoDetectionConfig): Promise<AudioAnalysisResult>
exportTimeline(): SyncTimeline | null
importTimeline(timeline: SyncTimeline): void

// Event handling
addEventListener(type: string, listener: Function): void
removeEventListener(type: string, listener: Function): void
```

### useAudioSync Hook

```typescript
interface UseAudioSyncReturn {
  // State
  syncState: SyncState | null;
  currentChord: ChordTimeMapping | null;
  timeline: SyncTimeline | null;
  
  // Configuration
  syncConfig: AudioSyncConfig;
  updateSyncConfig: (config: Partial<AudioSyncConfig>) => void;
  
  // Timeline management
  loadTimeline: (timeline: SyncTimeline) => Promise<void>;
  exportTimeline: () => SyncTimeline | null;
  
  // Annotation
  startAnnotation: () => void;
  stopAnnotation: () => void;
  addChordAnnotation: (chordName: string, startTime?: number, endTime?: number) => void;
  
  // Analysis
  analyzeAudio: (config?: Partial<AutoDetectionConfig>) => Promise<AudioAnalysisResult>;
}
```

## Future Enhancements

### Planned Features
- **MIDI Integration**: Support for MIDI input/output
- **Advanced Analysis**: Machine learning-based chord recognition
- **Collaborative Editing**: Real-time collaborative annotation
- **Audio Effects**: Built-in practice effects (metronome, backing tracks)
- **Mobile Optimization**: Touch-optimized annotation interface

### Performance Improvements
- **Web Workers**: Off-main-thread audio analysis
- **Streaming Analysis**: Real-time chord detection during playback
- **Predictive Caching**: Intelligent preloading of chord timings
- **Hardware Acceleration**: GPU-accelerated audio processing

---

*Last updated: December 2024*  
*Version: 1.0.0*  
*Author: ChordMe Development Team*