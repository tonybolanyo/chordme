/**
 * Audio Synchronization Demo Page
 * Demonstrates the audio-chord synchronization features
 */

import React, { useState, useCallback } from 'react';
import { ChordTimingAnnotator } from '../../components/ChordTimingAnnotator';
import { SynchronizedChordViewer } from '../../components/SynchronizedChordViewer';
import { useAudioSync } from '../../hooks/useAudioSync';
import { AudioSource, ChordTimeMapping, SyncTimeline } from '../../types/audio';
import './AudioSyncDemo.css';

const sampleChordProContent = `{title: Amazing Grace}
{artist: Traditional}
{key: G}

{start_of_verse}
[G]Amazing [G7]grace, how [C]sweet the [G]sound
That [G]saved a [Em]wretch like [D]me
I [G]once was [G7]lost, but [C]now I'm [G]found
Was [Em]blind but [D]now I [G]see
{end_of_verse}

{start_of_verse}
'Twas [G]grace that [G7]taught my [C]heart to [G]fear
And [G]grace my [Em]fears re-[D]lieved
How [G]precious [G7]did that [C]grace ap-[G]pear
The [Em]hour I [D]first be-[G]lieved
{end_of_verse}

{start_of_chorus}
[C]Amazing [G]grace, how [D]sweet the [G]sound
That [C]saved a [G]wretch like [D]me
[C]Amazing [G]grace, how [D]sweet the [Em]sound
That [C]saved a [D]wretch like [G]me
{end_of_chorus}`;

const sampleAudioSource: AudioSource = {
  id: 'demo-audio',
  url: '/demo-audio/amazing-grace.mp3',
  title: 'Amazing Grace',
  artist: 'Traditional',
  duration: 180,
  format: 'mp3',
  quality: 'high',
};

export const AudioSyncDemo: React.FC = () => {
  // State
  const [chordProContent, setChordProContent] = useState(sampleChordProContent);
  const [currentAudioSource] = useState<AudioSource>(sampleAudioSource);
  const [annotations, setAnnotations] = useState<ChordTimeMapping[]>([]);
  const [viewMode, setViewMode] = useState<'split' | 'annotator' | 'viewer'>('split');
  const [autoSync, setAutoSync] = useState(true);

  // Hooks
  const {
    timeline,
    syncConfig,
    updateSyncConfig,
    currentChord,
    syncState,
    analysisProgress,
    analyzeAudio,
    exportTimeline,
    importTimeline,
  } = useAudioSync({
    enablePracticeMode: true,
    defaultTolerance: 50,
  });

  // Handlers
  const handleAnnotationChange = useCallback((newAnnotations: ChordTimeMapping[]) => {
    setAnnotations(newAnnotations);
  }, []);

  const handleChordClick = useCallback((chord: string, timestamp: number) => {
    console.log(`Clicked chord ${chord} at ${timestamp}s`);
    // In a real implementation, this would seek the audio player
  }, []);

  const handleAnalyzeAudio = useCallback(async () => {
    try {
      await analyzeAudio({
        method: 'combined',
        sensitivity: 0.7,
        confidenceThreshold: 0.6,
      });
    } catch (error) {
      console.error('Audio analysis failed:', error);
    }
  }, [analyzeAudio]);

  const handleExportData = useCallback(() => {
    try {
      const exported = exportTimeline();
      if (exported) {
        const dataStr = JSON.stringify(exported, null, 2);
        const dataBlob = new Blob([dataStr], { type: 'application/json' });
        const url = URL.createObjectURL(dataBlob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `${exported.metadata.title || 'timeline'}-sync.json`;
        link.click();
        URL.revokeObjectURL(url);
      }
    } catch (error) {
      console.error('Export failed:', error);
    }
  }, [exportTimeline]);

  const handleImportData = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const data = JSON.parse(e.target?.result as string);
        await importTimeline(data);
      } catch (error) {
        console.error('Import failed:', error);
      }
    };
    reader.readAsText(file);
  }, [importTimeline]);

  const formatTime = (seconds: number): string => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = Math.floor(seconds % 60);
    const centiseconds = Math.floor((seconds % 1) * 100);
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}.${centiseconds.toString().padStart(2, '0')}`;
  };

  return (
    <div className="audio-sync-demo">
      {/* Header */}
      <div className="demo-header">
        <div className="demo-title">
          <h1>🎵 Audio-Chord Synchronization Demo</h1>
          <p>Interactive demonstration of timeline-based chord synchronization</p>
        </div>
        
        <div className="demo-status">
          {currentChord && (
            <div className="current-chord-display">
              <span className="label">Now Playing:</span>
              <span className="chord">{currentChord.chordName}</span>
              <span className="time">{formatTime(syncState?.syncPosition || 0)}</span>
            </div>
          )}
          
          {!currentChord && syncState?.isEnabled && (
            <div className="sync-ready">
              🎵 Synchronization Ready
            </div>
          )}
        </div>
      </div>

      {/* Controls */}
      <div className="demo-controls">
        <div className="control-group">
          <label>View Mode:</label>
          <select 
            value={viewMode} 
            onChange={(e) => setViewMode(e.target.value as unknown)}
            className="view-mode-select"
          >
            <option value="split">Split View</option>
            <option value="annotator">Annotator Only</option>
            <option value="viewer">Viewer Only</option>
          </select>
        </div>

        <div className="control-group">
          <label>
            <input
              type="checkbox"
              checked={autoSync}
              onChange={(e) => {
                setAutoSync(e.target.checked);
                updateSyncConfig({ autoHighlight: e.target.checked });
              }}
            />
            Auto-highlight chords
          </label>
        </div>

        <div className="control-group">
          <label>Sync Tolerance:</label>
          <input
            type="range"
            min="10"
            max="200"
            value={syncConfig.tolerance}
            onChange={(e) => updateSyncConfig({ tolerance: parseInt(e.target.value) })}
            className="tolerance-slider"
          />
          <span>{syncConfig.tolerance}ms</span>
        </div>

        <div className="control-buttons">
          <button
            onClick={handleAnalyzeAudio}
            disabled={analysisProgress > 0 && analysisProgress < 100}
            className="btn btn-analyze"
          >
            {analysisProgress > 0 && analysisProgress < 100 
              ? `Analyzing... ${analysisProgress}%` 
              : 'Auto-Detect Chords'
            }
          </button>

          <button
            onClick={handleExportData}
            disabled={!timeline}
            className="btn btn-export"
          >
            Export Timeline
          </button>

          <label className="btn btn-import">
            Import Timeline
            <input
              type="file"
              accept=".json"
              onChange={handleImportData}
              style={{ display: 'none' }}
            />
          </label>
        </div>
      </div>

      {/* Statistics */}
      <div className="demo-stats">
        <div className="stat-item">
          <span className="stat-label">Annotations:</span>
          <span className="stat-value">{annotations.length}</span>
        </div>
        <div className="stat-item">
          <span className="stat-label">Markers:</span>
          <span className="stat-value">{timeline?.markers.length || 0}</span>
        </div>
        <div className="stat-item">
          <span className="stat-label">Manual:</span>
          <span className="stat-value">
            {annotations.filter(a => a.source === 'manual').length}
          </span>
        </div>
        <div className="stat-item">
          <span className="stat-label">Auto-detected:</span>
          <span className="stat-value">
            {annotations.filter(a => a.source === 'automatic').length}
          </span>
        </div>
      </div>

      {/* Main Content */}
      <div className={`demo-content ${viewMode}`}>
        {(viewMode === 'split' || viewMode === 'annotator') && (
          <div className="annotator-section">
            <h3>📝 Chord Timing Annotation</h3>
            <ChordTimingAnnotator
              audioSource={currentAudioSource}
              onAnnotationChange={handleAnnotationChange}
              enableKeyboardShortcuts={true}
              className="demo-annotator"
            />
          </div>
        )}

        {(viewMode === 'split' || viewMode === 'viewer') && (
          <div className="viewer-section">
            <h3>🎼 Synchronized ChordPro Viewer</h3>
            <div className="content-editor">
              <label htmlFor="chordpro-content">ChordPro Content:</label>
              <textarea
                id="chordpro-content"
                value={chordProContent}
                onChange={(e) => setChordProContent(e.target.value)}
                className="chordpro-editor"
                rows={8}
                placeholder="Enter ChordPro content here..."
              />
            </div>
            <SynchronizedChordViewer
              content={chordProContent}
              audioSource={currentAudioSource}
              timeline={timeline || undefined}
              onChordClick={handleChordClick}
              enableAutoScroll={true}
              className="demo-viewer"
            />
          </div>
        )}
      </div>

      {/* Features List */}
      <div className="demo-features">
        <h3>✨ Available Features</h3>
        <div className="features-grid">
          <div className="feature-card">
            <h4>🎯 Manual Annotation</h4>
            <p>Use keyboard shortcuts (C/V) to manually annotate chord timings while audio plays</p>
            <ul>
              <li>Real-time timing capture</li>
              <li>Keyboard shortcuts for efficiency</li>
              <li>Visual feedback during annotation</li>
            </ul>
          </div>

          <div className="feature-card">
            <h4>🤖 Auto-Detection</h4>
            <p>Automatically analyze audio to detect chord changes using advanced algorithms</p>
            <ul>
              <li>Combined onset and chroma analysis</li>
              <li>Confidence scoring</li>
              <li>Adjustable sensitivity</li>
            </ul>
          </div>

          <div className="feature-card">
            <h4>🎵 Real-time Sync</h4>
            <p>See chords highlighted in real-time as audio plays with precise synchronization</p>
            <ul>
              <li>Timeline-based highlighting</li>
              <li>Configurable tolerance</li>
              <li>Auto-scrolling support</li>
            </ul>
          </div>

          <div className="feature-card">
            <h4>📍 Markers & Navigation</h4>
            <p>Add custom markers for easy navigation to song sections</p>
            <ul>
              <li>Section markers (verse, chorus, etc.)</li>
              <li>Quick navigation</li>
              <li>Practice loop sections</li>
            </ul>
          </div>

          <div className="feature-card">
            <h4>💾 Data Export/Import</h4>
            <p>Save and share your synchronized chord timings</p>
            <ul>
              <li>JSON format export</li>
              <li>Timeline versioning</li>
              <li>Cross-platform compatibility</li>
            </ul>
          </div>

          <div className="feature-card">
            <h4>⚙️ Customization</h4>
            <p>Adjust synchronization settings for optimal performance</p>
            <ul>
              <li>Sync tolerance adjustment</li>
              <li>Visual feedback controls</li>
              <li>Practice mode features</li>
            </ul>
          </div>
        </div>
      </div>

      {/* Implementation Notes */}
      <div className="demo-notes">
        <h3>🔧 Implementation Notes</h3>
        <div className="notes-content">
          <h4>Architecture:</h4>
          <ul>
            <li><strong>AudioSynchronizationService:</strong> Core timeline and sync management</li>
            <li><strong>useAudioSync Hook:</strong> React state management for sync features</li>
            <li><strong>Enhanced AudioEngine:</strong> Extended with synchronization capabilities</li>
          </ul>

          <h4>Key Technologies:</h4>
          <ul>
            <li><strong>Web Audio API:</strong> For audio analysis and precise timing</li>
            <li><strong>Event-Driven Architecture:</strong> For real-time updates</li>
            <li><strong>TypeScript:</strong> For type safety and developer experience</li>
          </ul>

          <h4>Performance Optimizations:</h4>
          <ul>
            <li>Debounced scroll synchronization</li>
            <li>Efficient event handling</li>
            <li>Minimal re-renders with React hooks</li>
          </ul>
        </div>
      </div>
    </div>
  );
};