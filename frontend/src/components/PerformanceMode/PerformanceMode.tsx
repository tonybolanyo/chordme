/**
 * Performance Mode Component
 * Full-screen performance interface optimized for live presentations, stage use, and practice sessions
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { SynchronizedChordViewer } from '../SynchronizedChordViewer';
import TranspositionControls from '../TranspositionControls';
import { AudioSource, SyncTimeline } from '../../types/audio';
import './PerformanceMode.css';

export interface PerformanceModeProps {
  content: string;
  audioSource?: AudioSource;
  timeline?: SyncTimeline;
  onClose?: () => void;
  className?: string;
}

export type PerformanceTheme = 'stage-bright' | 'stage-dark' | 'practice' | 'high-contrast';

export interface PerformanceModeState {
  isFullscreen: boolean;
  theme: PerformanceTheme;
  fontSize: number;
  showControls: boolean;
  currentTransposition: number;
  autoHideTimeout: number;
}

export const PerformanceMode: React.FC<PerformanceModeProps> = ({
  content,
  audioSource,
  timeline,
  onClose,
  className = '',
}) => {
  // Refs
  const containerRef = useRef<HTMLDivElement>(null);
  const hideTimeoutRef = useRef<NodeJS.Timeout>();

  // State
  const [state, setState] = useState<PerformanceModeState>({
    isFullscreen: false,
    theme: 'practice',
    fontSize: 20,
    showControls: true,
    currentTransposition: 0,
    autoHideTimeout: 5000,
  });

  // Fullscreen API support detection
  const isFullscreenSupported = useCallback(() => {
    return !!(
      document.fullscreenEnabled ||
      (document as any).webkitFullscreenEnabled ||
      (document as any).mozFullScreenEnabled ||
      (document as any).msFullscreenEnabled
    );
  }, []);

  // Enter fullscreen
  const enterFullscreen = useCallback(async () => {
    if (!containerRef.current || !isFullscreenSupported()) return;

    try {
      if (containerRef.current.requestFullscreen) {
        await containerRef.current.requestFullscreen();
      } else if ((containerRef.current as any).webkitRequestFullscreen) {
        await (containerRef.current as any).webkitRequestFullscreen();
      } else if ((containerRef.current as any).mozRequestFullScreen) {
        await (containerRef.current as any).mozRequestFullScreen();
      } else if ((containerRef.current as any).msRequestFullscreen) {
        await (containerRef.current as any).msRequestFullscreen();
      }
    } catch (error) {
      console.error('Failed to enter fullscreen:', error);
    }
  }, [isFullscreenSupported]);

  // Exit fullscreen
  const exitFullscreen = useCallback(async () => {
    try {
      if (document.exitFullscreen) {
        await document.exitFullscreen();
      } else if ((document as any).webkitExitFullscreen) {
        await (document as any).webkitExitFullscreen();
      } else if ((document as any).mozCancelFullScreen) {
        await (document as any).mozCancelFullScreen();
      } else if ((document as any).msExitFullscreen) {
        await (document as any).msExitFullscreen();
      }
    } catch (error) {
      console.error('Failed to exit fullscreen:', error);
    }
  }, []);

  // Toggle fullscreen
  const toggleFullscreen = useCallback(async () => {
    if (state.isFullscreen) {
      await exitFullscreen();
    } else {
      await enterFullscreen();
    }
  }, [state.isFullscreen, exitFullscreen, enterFullscreen]);

  // Fullscreen change handler
  const handleFullscreenChange = useCallback(() => {
    const isCurrentlyFullscreen = !!(
      document.fullscreenElement ||
      (document as any).webkitFullscreenElement ||
      (document as any).mozFullScreenElement ||
      (document as any).msFullscreenElement
    );

    setState(prev => ({
      ...prev,
      isFullscreen: isCurrentlyFullscreen,
    }));
  }, []);

  // Setup fullscreen event listeners
  useEffect(() => {
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    document.addEventListener('webkitfullscreenchange', handleFullscreenChange);
    document.addEventListener('mozfullscreenchange', handleFullscreenChange);
    document.addEventListener('MSFullscreenChange', handleFullscreenChange);

    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      document.removeEventListener('webkitfullscreenchange', handleFullscreenChange);
      document.removeEventListener('mozfullscreenchange', handleFullscreenChange);
      document.removeEventListener('MSFullscreenChange', handleFullscreenChange);
    };
  }, [handleFullscreenChange]);

  // Auto-hide controls
  const resetAutoHideTimer = useCallback(() => {
    if (hideTimeoutRef.current) {
      clearTimeout(hideTimeoutRef.current);
    }

    setState(prev => ({ ...prev, showControls: true }));

    if (state.isFullscreen && state.autoHideTimeout > 0) {
      hideTimeoutRef.current = setTimeout(() => {
        setState(prev => ({ ...prev, showControls: false }));
      }, state.autoHideTimeout);
    }
  }, [state.isFullscreen, state.autoHideTimeout]);

  // Mouse movement handler for auto-hide
  const handleMouseMove = useCallback(() => {
    if (state.isFullscreen) {
      resetAutoHideTimer();
    }
  }, [state.isFullscreen, resetAutoHideTimer]);

  // Keyboard shortcuts
  const handleKeyDown = useCallback((event: KeyboardEvent) => {
    // Prevent default handling if we're capturing these keys
    const capturedKeys = ['F11', 'Escape', 'F1', 'F2', 'F3', 'F4'];
    
    if (capturedKeys.includes(event.key)) {
      event.preventDefault();
    }

    switch (event.key) {
      case 'F11':
        toggleFullscreen();
        break;
      case 'Escape':
        if (state.isFullscreen) {
          exitFullscreen();
        } else if (onClose) {
          onClose();
        }
        break;
      case 'F1':
        setState(prev => ({ ...prev, theme: 'practice' }));
        break;
      case 'F2':
        setState(prev => ({ ...prev, theme: 'stage-bright' }));
        break;
      case 'F3':
        setState(prev => ({ ...prev, theme: 'stage-dark' }));
        break;
      case 'F4':
        setState(prev => ({ ...prev, theme: 'high-contrast' }));
        break;
      case '+':
      case '=':
        if (event.ctrlKey || event.metaKey) {
          event.preventDefault();
          setState(prev => ({ 
            ...prev, 
            fontSize: Math.min(prev.fontSize + 2, 48) 
          }));
        }
        break;
      case '-':
        if (event.ctrlKey || event.metaKey) {
          event.preventDefault();
          setState(prev => ({ 
            ...prev, 
            fontSize: Math.max(prev.fontSize - 2, 12) 
          }));
        }
        break;
      case '0':
        if (event.ctrlKey || event.metaKey) {
          event.preventDefault();
          setState(prev => ({ ...prev, fontSize: 20 }));
        }
        break;
      case 'h':
      case 'H':
        if (!event.ctrlKey && !event.metaKey) {
          setState(prev => ({ ...prev, showControls: !prev.showControls }));
        }
        break;
    }

    // Reset auto-hide timer on any key press
    if (state.isFullscreen) {
      resetAutoHideTimer();
    }
  }, [state.isFullscreen, toggleFullscreen, exitFullscreen, onClose, resetAutoHideTimer]);

  // Keyboard event listeners
  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  // Mouse move listener for auto-hide
  useEffect(() => {
    if (state.isFullscreen) {
      document.addEventListener('mousemove', handleMouseMove);
      resetAutoHideTimer();
      
      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        if (hideTimeoutRef.current) {
          clearTimeout(hideTimeoutRef.current);
        }
      };
    }
  }, [state.isFullscreen, handleMouseMove, resetAutoHideTimer]);

  // Handle transposition
  const handleTranspose = useCallback((semitones: number) => {
    setState(prev => ({
      ...prev,
      currentTransposition: prev.currentTransposition + semitones,
    }));
  }, []);

  // Reset transposition
  const handleResetTransposition = useCallback(() => {
    setState(prev => ({ ...prev, currentTransposition: 0 }));
  }, []);

  // Theme change handler
  const handleThemeChange = useCallback((theme: PerformanceTheme) => {
    setState(prev => ({ ...prev, theme }));
  }, []);

  // Font size change handler
  const handleFontSizeChange = useCallback((fontSize: number) => {
    setState(prev => ({ ...prev, fontSize: Math.max(12, Math.min(48, fontSize)) }));
  }, []);

  const performanceClasses = [
    'performance-mode',
    `performance-mode--${state.theme}`,
    state.isFullscreen && 'performance-mode--fullscreen',
    !state.showControls && 'performance-mode--controls-hidden',
    className,
  ].filter(Boolean).join(' ');

  return (
    <div 
      ref={containerRef}
      className={performanceClasses}
      style={{
        '--performance-font-size': `${state.fontSize}px`,
      } as React.CSSProperties}
      onMouseMove={handleMouseMove}
    >
      {/* Controls Bar */}
      <div className={`performance-mode__controls ${state.showControls ? 'visible' : 'hidden'}`}>
        <div className="performance-mode__controls-left">
          <button
            onClick={toggleFullscreen}
            className="performance-mode__control-btn"
            title={`${state.isFullscreen ? 'Exit' : 'Enter'} fullscreen (F11)`}
            disabled={!isFullscreenSupported()}
          >
            {state.isFullscreen ? '⊖' : '⊞'}
          </button>

          {/* Theme Selection */}
          <div className="performance-mode__theme-selector">
            <button
              onClick={() => handleThemeChange('practice')}
              className={`theme-btn ${state.theme === 'practice' ? 'active' : ''}`}
              title="Practice theme (F1)"
            >
              Practice
            </button>
            <button
              onClick={() => handleThemeChange('stage-bright')}
              className={`theme-btn ${state.theme === 'stage-bright' ? 'active' : ''}`}
              title="Stage bright theme (F2)"
            >
              Stage Bright
            </button>
            <button
              onClick={() => handleThemeChange('stage-dark')}
              className={`theme-btn ${state.theme === 'stage-dark' ? 'active' : ''}`}
              title="Stage dark theme (F3)"
            >
              Stage Dark
            </button>
            <button
              onClick={() => handleThemeChange('high-contrast')}
              className={`theme-btn ${state.theme === 'high-contrast' ? 'active' : ''}`}
              title="High contrast theme (F4)"
            >
              High Contrast
            </button>
          </div>

          {/* Font Size Controls */}
          <div className="performance-mode__font-controls">
            <button
              onClick={() => handleFontSizeChange(state.fontSize - 2)}
              className="performance-mode__control-btn"
              title="Decrease font size (Ctrl+-)"
              disabled={state.fontSize <= 12}
            >
              A-
            </button>
            <span className="font-size-display">{state.fontSize}px</span>
            <button
              onClick={() => handleFontSizeChange(state.fontSize + 2)}
              className="performance-mode__control-btn"
              title="Increase font size (Ctrl++)"
              disabled={state.fontSize >= 48}
            >
              A+
            </button>
          </div>
        </div>

        <div className="performance-mode__controls-center">
          {/* Transposition Controls */}
          <TranspositionControls
            onTranspose={handleTranspose}
            onReset={handleResetTransposition}
            currentTransposition={state.currentTransposition}
            enableAdvancedFeatures={true}
            className="performance-mode__transposition"
          />
        </div>

        <div className="performance-mode__controls-right">
          {onClose && (
            <button
              onClick={onClose}
              className="performance-mode__control-btn performance-mode__close-btn"
              title="Close performance mode (Esc)"
            >
              ✕
            </button>
          )}
        </div>
      </div>

      {/* Main Content */}
      <div className="performance-mode__content">
        <SynchronizedChordViewer
          content={content}
          audioSource={audioSource}
          timeline={timeline}
          className="performance-mode__viewer"
          enableAutoScroll={true}
        />
      </div>

      {/* Keyboard Shortcuts Help */}
      {state.showControls && (
        <div className="performance-mode__help">
          <div className="help-item">F11: Fullscreen</div>
          <div className="help-item">F1-F4: Themes</div>
          <div className="help-item">Ctrl +/-: Font Size</div>
          <div className="help-item">H: Toggle Controls</div>
          <div className="help-item">Esc: Exit</div>
        </div>
      )}
    </div>
  );
};