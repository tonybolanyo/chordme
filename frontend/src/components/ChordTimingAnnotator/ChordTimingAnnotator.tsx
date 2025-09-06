/**
 * Chord Timing Annotation Component
 * Provides UI for manually annotating chord timings in audio
 */

import React, { useState, useCallback, useRef, useEffect } from 'react';
import { ChordTimeMapping, PlaybackMarker, AudioSource } from '../../types/audio';
import { useAudioSync } from '../../hooks/useAudioSync';
import './ChordTimingAnnotator.css';

interface ChordTimingAnnotatorProps {
  audioSource?: AudioSource;
  className?: string;
  onAnnotationChange?: (annotations: ChordTimeMapping[]) => void;
  enableKeyboardShortcuts?: boolean;
  showMiniPlayer?: boolean;
}

interface AnnotationDraft {
  chordName: string;
  startTime: number;
  endTime?: number;
  isActive: boolean;
}

export const ChordTimingAnnotator: React.FC<ChordTimingAnnotatorProps> = ({
  audioSource,
  className = '',
  onAnnotationChange,
  enableKeyboardShortcuts = true,
  showMiniPlayer = true,
}) => {
  // Hooks
  const {
    timeline,
    currentChord,
    isAnnotating,
    syncState,
    startAnnotation,
    stopAnnotation,
    addChordAnnotation,
    updateChordAnnotation,
    removeChordAnnotation,
    addMarker,
    createNewTimeline,
    loadTimeline,
  } = useAudioSync({ enablePracticeMode: true });

  // Local state
  const [chordName, setChordName] = useState('');
  const [annotationDraft, setAnnotationDraft] = useState<AnnotationDraft | null>(null);
  const [selectedAnnotation, setSelectedAnnotation] = useState<string | null>(null);
  const [showMarkerModal, setShowMarkerModal] = useState(false);
  const [markerName, setMarkerName] = useState('');

  // Refs
  const chordInputRef = useRef<HTMLInputElement>(null);

  // Initialize timeline when audio source changes
  useEffect(() => {
    if (audioSource && !timeline) {
      const newTimeline = createNewTimeline(audioSource);
      loadTimeline(newTimeline);
    }
  }, [audioSource, timeline, createNewTimeline, loadTimeline]);

  // Notify parent of annotation changes
  useEffect(() => {
    if (timeline && onAnnotationChange) {
      onAnnotationChange(timeline.chordMappings);
    }
  }, [timeline, onAnnotationChange]);

  // Keyboard shortcuts
  useEffect(() => {
    if (!enableKeyboardShortcuts) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      // Ignore if typing in an input field
      if (event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement) {
        return;
      }

      switch (event.key) {
        case 'c':
          event.preventDefault();
          handleStartAnnotation();
          break;
        case 'v':
          event.preventDefault();
          handleStopAnnotation();
          break;
        case 'm':
          event.preventDefault();
          handleAddMarker();
          break;
        case 'Escape':
          event.preventDefault();
          handleCancelAnnotation();
          break;
        case 'Delete':
        case 'Backspace':
          if (selectedAnnotation) {
            event.preventDefault();
            handleDeleteAnnotation(selectedAnnotation);
          }
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [enableKeyboardShortcuts, selectedAnnotation, isAnnotating]);

  // Annotation handlers
  const handleStartAnnotation = useCallback(() => {
    if (!syncState || isAnnotating) return;

    const currentTime = syncState.syncPosition;
    setAnnotationDraft({
      chordName: chordName || 'C',
      startTime: currentTime,
      isActive: true,
    });

    startAnnotation();
    
    // Focus chord input
    if (chordInputRef.current) {
      chordInputRef.current.focus();
    }
  }, [syncState, isAnnotating, chordName, startAnnotation]);

  const handleStopAnnotation = useCallback(() => {
    if (!isAnnotating || !annotationDraft || !syncState) return;

    const endTime = syncState.syncPosition;
    
    // Only create annotation if there's a meaningful duration
    if (endTime > annotationDraft.startTime + 0.1) {
      addChordAnnotation(
        annotationDraft.chordName,
        annotationDraft.startTime,
        endTime
      );
    }

    stopAnnotation();
    setAnnotationDraft(null);
  }, [isAnnotating, annotationDraft, syncState, addChordAnnotation, stopAnnotation]);

  const handleCancelAnnotation = useCallback(() => {
    if (isAnnotating) {
      stopAnnotation();
      setAnnotationDraft(null);
    }
  }, [isAnnotating, stopAnnotation]);

  const handleChordNameChange = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const newChordName = event.target.value;
    setChordName(newChordName);
    
    if (annotationDraft) {
      setAnnotationDraft({
        ...annotationDraft,
        chordName: newChordName,
      });
    }
  }, [annotationDraft]);

  const handleDeleteAnnotation = useCallback((annotationId: string) => {
    removeChordAnnotation(annotationId);
    setSelectedAnnotation(null);
  }, [removeChordAnnotation]);

  const handleAnnotationClick = useCallback((annotation: ChordTimeMapping) => {
    setSelectedAnnotation(annotation.id);
  }, []);

  const handleAddMarker = useCallback(() => {
    setShowMarkerModal(true);
  }, []);

  const handleMarkerSubmit = useCallback(() => {
    if (!markerName.trim() || !syncState) return;

    const marker: PlaybackMarker = {
      id: `marker_${Date.now()}`,
      time: syncState.syncPosition,
      label: markerName.trim(),
      type: 'custom',
    };

    addMarker(marker);
    setMarkerName('');
    setShowMarkerModal(false);
  }, [markerName, syncState, addMarker]);

  // Format time display
  const formatTime = useCallback((seconds: number): string => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = Math.floor(seconds % 60);
    const centiseconds = Math.floor((seconds % 1) * 100);
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}.${centiseconds.toString().padStart(2, '0')}`;
  }, []);

  // Get current position for visualization
  const currentPosition = syncState?.syncPosition || 0;

  return (
    <div className={`chord-timing-annotator ${className}`}>
      {/* Header */}
      <div className="annotator-header">
        <h3>Chord Timing Annotation</h3>
        {audioSource && (
          <div className="audio-info">
            <span>{audioSource.title}</span>
            {audioSource.artist && <span> - {audioSource.artist}</span>}
          </div>
        )}
      </div>

      {/* Controls */}
      <div className="annotation-controls">
        <div className="chord-input-group">
          <label htmlFor="chord-name">Chord:</label>
          <input
            ref={chordInputRef}
            id="chord-name"
            type="text"
            value={chordName}
            onChange={handleChordNameChange}
            placeholder="C, Am, F7, etc."
            className="chord-input"
          />
        </div>

        <div className="control-buttons">
          <button
            onClick={handleStartAnnotation}
            disabled={isAnnotating || !syncState}
            className="btn btn-start"
            title="Start annotation (C)"
          >
            Start (C)
          </button>
          
          <button
            onClick={handleStopAnnotation}
            disabled={!isAnnotating}
            className="btn btn-stop"
            title="Stop annotation (V)"
          >
            Stop (V)
          </button>
          
          <button
            onClick={handleCancelAnnotation}
            disabled={!isAnnotating}
            className="btn btn-cancel"
            title="Cancel annotation (Esc)"
          >
            Cancel
          </button>
          
          <button
            onClick={handleAddMarker}
            disabled={!syncState}
            className="btn btn-marker"
            title="Add marker (M)"
          >
            Add Marker (M)
          </button>
        </div>
      </div>

      {/* Current Status */}
      <div className="annotation-status">
        <div className="status-row">
          <span>Current Time: {formatTime(currentPosition)}</span>
          {currentChord && (
            <span className="current-chord">
              Playing: <strong>{currentChord.chordName}</strong>
            </span>
          )}
        </div>
        
        {isAnnotating && annotationDraft && (
          <div className="status-row annotation-active">
            <span>Recording: <strong>{annotationDraft.chordName}</strong></span>
            <span>
              Duration: {formatTime(currentPosition - annotationDraft.startTime)}
            </span>
          </div>
        )}
      </div>

      {/* Annotations List */}
      <div className="annotations-list">
        <h4>Chord Annotations ({timeline?.chordMappings.length || 0})</h4>
        
        {timeline?.chordMappings.length === 0 ? (
          <div className="empty-state">
            <p>No chord annotations yet.</p>
            <p>Press 'C' to start annotating chords while the audio plays.</p>
          </div>
        ) : (
          <div className="annotations-container">
            {timeline?.chordMappings
              .sort((a, b) => a.startTime - b.startTime)
              .map((annotation) => (
                <div
                  key={annotation.id}
                  className={`annotation-item ${
                    selectedAnnotation === annotation.id ? 'selected' : ''
                  } ${
                    currentChord?.id === annotation.id ? 'current' : ''
                  }`}
                  onClick={() => handleAnnotationClick(annotation)}
                >
                  <div className="annotation-chord">
                    <strong>{annotation.chordName}</strong>
                    {annotation.confidence && (
                      <span className="confidence">
                        ({Math.round(annotation.confidence * 100)}%)
                      </span>
                    )}
                  </div>
                  <div className="annotation-timing">
                    {formatTime(annotation.startTime)} - {formatTime(annotation.endTime)}
                    <span className="duration">
                      ({formatTime(annotation.endTime - annotation.startTime)})
                    </span>
                  </div>
                  <div className="annotation-source">
                    <span className={`source-badge ${annotation.source}`}>
                      {annotation.source}
                    </span>
                    {annotation.verified && (
                      <span className="verified-badge">✓</span>
                    )}
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeleteAnnotation(annotation.id);
                    }}
                    className="delete-btn"
                    title="Delete annotation"
                  >
                    ×
                  </button>
                </div>
              ))}
          </div>
        )}
      </div>

      {/* Markers List */}
      {timeline?.markers && timeline.markers.length > 0 && (
        <div className="markers-list">
          <h4>Markers ({timeline.markers.length})</h4>
          <div className="markers-container">
            {timeline.markers
              .sort((a, b) => a.time - b.time)
              .map((marker) => (
                <div key={marker.id} className="marker-item">
                  <div className="marker-label">
                    <strong>{marker.label}</strong>
                    <span className={`marker-type ${marker.type}`}>
                      {marker.type}
                    </span>
                  </div>
                  <div className="marker-time">
                    {formatTime(marker.time)}
                  </div>
                </div>
              ))}
          </div>
        </div>
      )}

      {/* Keyboard Shortcuts Help */}
      {enableKeyboardShortcuts && (
        <div className="keyboard-shortcuts">
          <details>
            <summary>Keyboard Shortcuts</summary>
            <div className="shortcuts-list">
              <div><kbd>C</kbd> - Start chord annotation</div>
              <div><kbd>V</kbd> - Stop chord annotation</div>
              <div><kbd>M</kbd> - Add marker at current position</div>
              <div><kbd>Esc</kbd> - Cancel current annotation</div>
              <div><kbd>Del</kbd> - Delete selected annotation</div>
            </div>
          </details>
        </div>
      )}

      {/* Marker Modal */}
      {showMarkerModal && (
        <div className="modal-overlay">
          <div className="marker-modal">
            <h4>Add Marker</h4>
            <p>Time: {formatTime(currentPosition)}</p>
            <input
              type="text"
              value={markerName}
              onChange={(e) => setMarkerName(e.target.value)}
              placeholder="Marker name"
              autoFocus
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  handleMarkerSubmit();
                } else if (e.key === 'Escape') {
                  setShowMarkerModal(false);
                  setMarkerName('');
                }
              }}
            />
            <div className="modal-buttons">
              <button onClick={handleMarkerSubmit}>Add Marker</button>
              <button
                onClick={() => {
                  setShowMarkerModal(false);
                  setMarkerName('');
                }}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};