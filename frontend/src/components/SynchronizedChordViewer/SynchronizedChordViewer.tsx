/**
 * Synchronized ChordPro Viewer Component
 * Displays ChordPro content with real-time chord highlighting during audio playback
 */

import React, { useEffect, useRef, useState, useCallback } from 'react';
import { ChordTimeMapping, AudioSource, SyncTimeline } from '../../types/audio';
import { useAudioSync } from '../../hooks/useAudioSync';
import { useAutoScrollAndRemoteControl } from '../../hooks/useAutoScrollAndRemoteControl';
import './SynchronizedChordViewer.css';

interface SynchronizedChordViewerProps {
  content: string;
  audioSource?: AudioSource;
  timeline?: SyncTimeline;
  className?: string;
  enableAutoScroll?: boolean;
  enableRemoteControl?: boolean;
  enableVoiceControl?: boolean;
  highlightColor?: string;
  onChordClick?: (chord: string, timestamp: number) => void;
}

interface ParsedChordProLine {
  type: 'chord' | 'lyric' | 'directive' | 'empty';
  content: string;
  chords?: Array<{
    chord: string;
    position: number;
    id?: string;
  }>;
  lineNumber: number;
}

export const SynchronizedChordViewer: React.FC<SynchronizedChordViewerProps> = ({
  content,
  audioSource,
  timeline,
  className = '',
  enableAutoScroll = true,
  enableRemoteControl = false,
  enableVoiceControl = false,
  highlightColor = '#ffeaa7',
  onChordClick,
}) => {
  // Hooks
  const {
    currentChord,
    nextChord,
    syncState,
    loadTimeline,
  } = useAudioSync();

  const {
    isAutoScrollActive,
    isEmergencyStopped,
    handleChordChange,
    setScrollContainer,
    setTimeline,
    setAudioSource,
    autoScrollConfig,
  } = useAutoScrollAndRemoteControl({
    enableAutoScroll,
    enableRemoteControl,
    enableVoiceControl,
  });

  // Refs
  const viewerRef = useRef<HTMLDivElement>(null);
  const highlightedElementRef = useRef<HTMLElement | null>(null);

  // Local state
  const [parsedContent, setParsedContent] = useState<ParsedChordProLine[]>([]);
  const [chordElements, setChordElements] = useState<Map<string, HTMLElement>>(new Map());

  // Load timeline when provided
  useEffect(() => {
    if (timeline) {
      loadTimeline(timeline);
      setTimeline(timeline);
    }
  }, [timeline, loadTimeline, setTimeline]);

  // Set audio source
  useEffect(() => {
    if (audioSource) {
      setAudioSource(audioSource);
    }
  }, [audioSource, setAudioSource]);

  // Set scroll container
  useEffect(() => {
    if (viewerRef.current) {
      setScrollContainer(viewerRef.current);
    }
  }, [setScrollContainer]);

  // Parse ChordPro content
  useEffect(() => {
    const parsed = parseChordProContent(content);
    setParsedContent(parsed);
  }, [content]);

  // Register chord elements after render
  useEffect(() => {
    if (!viewerRef.current) return;

    const elements = new Map<string, HTMLElement>();
    const chordSpans = viewerRef.current.querySelectorAll('[data-chord-id]');
    
    chordSpans.forEach((element) => {
      const chordId = element.getAttribute('data-chord-id');
      if (chordId && element instanceof HTMLElement) {
        elements.set(chordId, element);
      }
    });

    setChordElements(elements);
  }, [parsedContent]);

  // Handle chord highlighting
  useEffect(() => {
    // Clear previous highlight
    if (highlightedElementRef.current) {
      highlightedElementRef.current.style.backgroundColor = '';
      highlightedElementRef.current.classList.remove('current-chord');
    }

    // Highlight current chord
    if (currentChord) {
      const element = chordElements.get(currentChord.id);
      if (element) {
        element.style.backgroundColor = highlightColor;
        element.classList.add('current-chord');
        highlightedElementRef.current = element;

        // Use enhanced auto-scroll when available
        if (enableAutoScroll && autoScrollConfig.enabled && !isEmergencyStopped) {
          handleChordChange(currentChord, element, syncState?.syncPosition || 0);
        } else if (enableAutoScroll) {
          // Fallback to simple scroll for compatibility
          scrollToChord(element);
        }
      }
    }
  }, [currentChord, chordElements, highlightColor, enableAutoScroll, autoScrollConfig.enabled, isEmergencyStopped, handleChordChange, syncState?.syncPosition]);

  // Parse ChordPro content into structured data
  const parseChordProContent = useCallback((chordProText: string): ParsedChordProLine[] => {
    const lines = chordProText.split('\n');
    const parsed: ParsedChordProLine[] = [];

    lines.forEach((line, index) => {
      const trimmedLine = line.trim();
      
      if (trimmedLine === '') {
        parsed.push({
          type: 'empty',
          content: '',
          lineNumber: index,
        });
      } else if (trimmedLine.startsWith('{') && trimmedLine.endsWith('}')) {
        // Directive line
        parsed.push({
          type: 'directive',
          content: trimmedLine,
          lineNumber: index,
        });
      } else if (line.includes('[') && line.includes(']')) {
        // Line with chords
        const chords: Array<{ chord: string; position: number; id?: string }> = [];
        let lyricLine = line;
        
        // Extract chords and their positions
        const chordRegex = /\[([^\]]+)\]/g;
        let match;
        let offset = 0;
        
        while ((match = chordRegex.exec(line)) !== null) {
          const chordName = match[1];
          const originalPosition = match.index;
          const adjustedPosition = originalPosition - offset;
          
          // Find matching timeline mapping
          const mapping = timeline?.chordMappings.find(
            (mapping) => 
              mapping.chordName === chordName &&
              mapping.metadata?.originalPosition === originalPosition
          );
          
          chords.push({
            chord: chordName,
            position: adjustedPosition,
            id: mapping?.id,
          });
          
          // Remove chord from lyric line
          lyricLine = lyricLine.replace(match[0], '');
          offset += match[0].length;
        }
        
        parsed.push({
          type: 'chord',
          content: lyricLine,
          chords,
          lineNumber: index,
        });
      } else {
        // Regular lyric line
        parsed.push({
          type: 'lyric',
          content: line,
          lineNumber: index,
        });
      }
    });

    return parsed;
  }, [timeline]);

  // Scroll to highlighted chord using enhanced auto-scroll service
  const scrollToChord = useCallback((element: HTMLElement) => {
    if (!viewerRef.current) return;

    const viewerRect = viewerRef.current.getBoundingClientRect();
    const elementRect = element.getBoundingClientRect();
    
    // Check if element is visible
    const isVisible = (
      elementRect.top >= viewerRect.top &&
      elementRect.bottom <= viewerRect.bottom
    );

    if (!isVisible) {
      // Simple fallback scroll to center the element (for basic mode)
      const scrollTop = 
        element.offsetTop - 
        viewerRef.current.offsetTop - 
        (viewerRef.current.clientHeight / 2) + 
        (element.clientHeight / 2);
      
      viewerRef.current.scrollTo({
        top: scrollTop,
        behavior: 'smooth',
      });
    }
  }, []);

  // Handle chord click
  const handleChordClick = useCallback((
    chordName: string,
    chordId?: string,
    event?: React.MouseEvent
  ) => {
    if (event) {
      event.preventDefault();
    }

    // Find timestamp from timeline
    let timestamp = 0;
    if (chordId && timeline) {
      const mapping = timeline.chordMappings.find(m => m.id === chordId);
      if (mapping) {
        timestamp = mapping.startTime;
      }
    } else if (syncState) {
      timestamp = syncState.syncPosition;
    }

    onChordClick?.(chordName, timestamp);
  }, [timeline, syncState, onChordClick]);

  // Render a line with chord highlighting
  const renderChordLine = useCallback((line: ParsedChordProLine) => {
    if (!line.chords || line.chords.length === 0) {
      return <span>{line.content}</span>;
    }

    const parts: React.ReactNode[] = [];
    let lastPosition = 0;

    // Sort chords by position
    const sortedChords = [...line.chords].sort((a, b) => a.position - b.position);

    sortedChords.forEach((chordInfo, index) => {
      // Add text before chord
      if (chordInfo.position > lastPosition) {
        parts.push(
          <span key={`text-${index}`}>
            {line.content.substring(lastPosition, chordInfo.position)}
          </span>
        );
      }

      // Add chord
      parts.push(
        <span
          key={`chord-${index}`}
          className="chord-marker"
          data-chord-id={chordInfo.id}
          onClick={(e) => handleChordClick(chordInfo.chord, chordInfo.id, e)}
          title={`Chord: ${chordInfo.chord}${chordInfo.id ? ' (synced)' : ''}`}
        >
          {chordInfo.chord}
        </span>
      );

      lastPosition = chordInfo.position;
    });

    // Add remaining text
    if (lastPosition < line.content.length) {
      parts.push(
        <span key="text-end">
          {line.content.substring(lastPosition)}
        </span>
      );
    }

    return <>{parts}</>;
  }, [handleChordClick]);

  // Render the content
  const renderContent = useCallback(() => {
    return parsedContent.map((line, index) => {
      switch (line.type) {
        case 'empty':
          return <div key={index} className="chordpro-line empty-line">&nbsp;</div>;
          
        case 'directive':
          return (
            <div key={index} className="chordpro-line directive-line">
              {line.content}
            </div>
          );
          
        case 'chord':
          return (
            <div key={index} className="chordpro-line chord-line">
              {renderChordLine(line)}
            </div>
          );
          
        case 'lyric':
        default:
          return (
            <div key={index} className="chordpro-line lyric-line">
              {line.content}
            </div>
          );
      }
    });
  }, [parsedContent, renderChordLine]);

  return (
    <div className={`synchronized-chord-viewer ${className}`}>
      {/* Header with sync status */}
      <div className="viewer-header">
        <div className="sync-status">
          {currentChord && (
            <div className="current-info">
              <span className="current-label">Now Playing:</span>
              <span className="current-chord-name">{currentChord.chordName}</span>
              {nextChord && (
                <span className="next-chord">
                  Next: {nextChord.chordName}
                </span>
              )}
            </div>
          )}
          
          {!currentChord && syncState?.isEnabled && (
            <div className="sync-ready">
              <span>🎵 Sync ready - play audio to see highlighted chords</span>
            </div>
          )}
          
          {!syncState?.isEnabled && (
            <div className="sync-disabled">
              <span>Synchronization disabled</span>
            </div>
          )}
        </div>

        {audioSource && (
          <div className="audio-info">
            <span>{audioSource.title}</span>
            {audioSource.artist && <span> - {audioSource.artist}</span>}
          </div>
        )}
      </div>

      {/* Content viewer */}
      <div
        ref={viewerRef}
        className="content-viewer"
        style={{ '--highlight-color': highlightColor } as React.CSSProperties}
      >
        {parsedContent.length > 0 ? (
          renderContent()
        ) : (
          <div className="empty-content">
            <p>No content to display</p>
            <p>Add ChordPro content to see synchronized highlighting</p>
          </div>
        )}
      </div>

      {/* Legend */}
      <div className="viewer-legend">
        <div className="legend-item">
          <span className="chord-marker sample">C</span>
          <span>Synced chord (clickable)</span>
        </div>
        <div className="legend-item">
          <span className="chord-marker sample current-chord">G</span>
          <span>Currently playing</span>
        </div>
      </div>
    </div>
  );
};