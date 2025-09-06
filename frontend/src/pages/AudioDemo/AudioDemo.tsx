/**
 * Audio Demo Page
 * Demonstrates the audio playback engine capabilities
 */

import React, { useState } from 'react';
import { AudioPlayer } from '../../components/AudioPlayer';
import { AudioSource, Playlist, PlaylistItem, AudioError } from '../../types/audio';
import './AudioDemo.css';

// Sample audio sources for demonstration
const sampleTracks: AudioSource[] = [
  {
    id: 'demo-track-1',
    url: 'https://www.soundjay.com/misc/sounds/click-003.wav', // Short demo sound
    title: 'Demo Track 1',
    artist: 'Demo Artist',
    duration: 3,
    format: 'wav',
    quality: 'high',
    metadata: {
      title: 'Demo Track 1',
      artist: 'Demo Artist',
      album: 'Demo Album',
      year: 2024,
      genre: 'Demo',
    },
  },
  {
    id: 'demo-track-2',
    url: 'https://www.soundjay.com/misc/sounds/click-005.wav', // Another short demo sound
    title: 'Demo Track 2',
    artist: 'Demo Artist',
    duration: 2,
    format: 'wav',
    quality: 'high',
    metadata: {
      title: 'Demo Track 2',
      artist: 'Demo Artist',
      album: 'Demo Album',
      year: 2024,
      genre: 'Demo',
    },
  },
];

// Create demo playlist
const createDemoPlaylist = (): Playlist => ({
  id: 'demo-playlist',
  name: 'Audio Engine Demo',
  description: 'Demonstration of ChordMe audio playback capabilities',
  items: sampleTracks.map((track, index): PlaylistItem => ({
    id: `playlist-item-${index}`,
    audioSource: track,
    order: index,
    addedAt: new Date(),
    playCount: 0,
  })),
  currentIndex: 0,
  shuffle: false,
  repeat: 'none',
  createdAt: new Date(),
  updatedAt: new Date(),
  duration: sampleTracks.reduce((total, track) => total + (track.duration || 0), 0),
  tags: ['demo', 'test'],
});

export const AudioDemo: React.FC = () => {
  const [playlist] = useState<Playlist>(createDemoPlaylist());
  const [showVisualization, setShowVisualization] = useState(true);
  const [playerTheme, setPlayerTheme] = useState<'light' | 'dark' | 'auto'>('auto');
  const [compactMode, setCompactMode] = useState(false);
  const [showPlaylist, setShowPlaylist] = useState(true);
  const [notifications, setNotifications] = useState<string[]>([]);

  const handleTrackChange = (track: AudioSource) => {
    addNotification(`Now playing: ${track.title} by ${track.artist || 'Unknown Artist'}`);
  };

  const handleError = (error: AudioError) => {
    addNotification(`Error: ${error.message}`, 'error');
  };

  const addNotification = (message: string, type: 'info' | 'error' = 'info') => {
    const notification = `${type.toUpperCase()}: ${message}`;
    setNotifications(prev => [...prev.slice(-4), notification]);
    
    // Auto-remove after 5 seconds
    setTimeout(() => {
      setNotifications(prev => prev.filter(n => n !== notification));
    }, 5000);
  };

  const clearNotifications = () => {
    setNotifications([]);
  };

  return (
    <div className="audio-demo">
      <div className="audio-demo__header">
        <h1 className="audio-demo__title">Audio Playback Engine Demo</h1>
        <p className="audio-demo__description">
          Experience ChordMe's comprehensive audio playback capabilities with multiple formats,
          visualization, and advanced controls.
        </p>
      </div>

      {/* Controls */}
      <div className="audio-demo__controls">
        <h2 className="audio-demo__section-title">Player Configuration</h2>
        
        <div className="audio-demo__control-group">
          <label className="audio-demo__control-label">
            <input
              type="checkbox"
              checked={showVisualization}
              onChange={(e) => setShowVisualization(e.target.checked)}
            />
            Show Audio Visualization
          </label>
        </div>

        <div className="audio-demo__control-group">
          <label className="audio-demo__control-label">
            Theme:
            <select
              value={playerTheme}
              onChange={(e) => setPlayerTheme(e.target.value as 'light' | 'dark' | 'auto')}
              className="audio-demo__select"
            >
              <option value="auto">Auto</option>
              <option value="light">Light</option>
              <option value="dark">Dark</option>
            </select>
          </label>
        </div>

        <div className="audio-demo__control-group">
          <label className="audio-demo__control-label">
            <input
              type="checkbox"
              checked={compactMode}
              onChange={(e) => setCompactMode(e.target.checked)}
            />
            Compact Mode
          </label>
        </div>

        <div className="audio-demo__control-group">
          <label className="audio-demo__control-label">
            <input
              type="checkbox"
              checked={showPlaylist}
              onChange={(e) => setShowPlaylist(e.target.checked)}
            />
            Show Playlist
          </label>
        </div>
      </div>

      {/* Audio Player */}
      <div className="audio-demo__player-container">
        <h2 className="audio-demo__section-title">Audio Player</h2>
        <AudioPlayer
          playlist={playlist}
          showVisualization={showVisualization}
          theme={playerTheme}
          compact={compactMode}
          showPlaylist={showPlaylist}
          keyboardShortcuts={true}
          onTrackChange={handleTrackChange}
          onError={handleError}
          className="audio-demo__player"
        />
      </div>

      {/* Features Info */}
      <div className="audio-demo__features">
        <h2 className="audio-demo__section-title">Features Demonstrated</h2>
        <div className="audio-demo__feature-grid">
          <div className="audio-demo__feature">
            <h3>🎵 Multi-Format Support</h3>
            <p>Supports MP3, WAV, OGG, AAC, M4A, and FLAC audio formats</p>
          </div>
          <div className="audio-demo__feature">
            <h3>🎛️ Advanced Controls</h3>
            <p>Play, pause, stop, seek, volume, and playback speed controls</p>
          </div>
          <div className="audio-demo__feature">
            <h3>📊 Visualization</h3>
            <p>Real-time frequency spectrum visualization using Web Audio API</p>
          </div>
          <div className="audio-demo__feature">
            <h3>⌨️ Keyboard Shortcuts</h3>
            <p>Full keyboard control: Space (play/pause), arrows (seek/volume), M (mute)</p>
          </div>
          <div className="audio-demo__feature">
            <h3>📱 Responsive Design</h3>
            <p>Adaptive UI that works on desktop, tablet, and mobile devices</p>
          </div>
          <div className="audio-demo__feature">
            <h3>♿ Accessibility</h3>
            <p>Screen reader support, keyboard navigation, and high contrast mode</p>
          </div>
          <div className="audio-demo__feature">
            <h3>🎨 Themeable</h3>
            <p>Light, dark, and auto themes with CSS custom properties</p>
          </div>
          <div className="audio-demo__feature">
            <h3>🔄 Fallback Support</h3>
            <p>Automatic fallback to HTML5 Audio when Web Audio API is unavailable</p>
          </div>
        </div>
      </div>

      {/* Keyboard Shortcuts */}
      <div className="audio-demo__shortcuts">
        <h2 className="audio-demo__section-title">Keyboard Shortcuts</h2>
        <div className="audio-demo__shortcuts-grid">
          <div className="audio-demo__shortcut">
            <kbd>Space</kbd> or <kbd>K</kbd>
            <span>Play/Pause</span>
          </div>
          <div className="audio-demo__shortcut">
            <kbd>Ctrl</kbd> + <kbd>←</kbd>
            <span>Previous Track</span>
          </div>
          <div className="audio-demo__shortcut">
            <kbd>Ctrl</kbd> + <kbd>→</kbd>
            <span>Next Track</span>
          </div>
          <div className="audio-demo__shortcut">
            <kbd>←</kbd>
            <span>Seek Backward 10s</span>
          </div>
          <div className="audio-demo__shortcut">
            <kbd>→</kbd>
            <span>Seek Forward 10s</span>
          </div>
          <div className="audio-demo__shortcut">
            <kbd>↑</kbd>
            <span>Volume Up</span>
          </div>
          <div className="audio-demo__shortcut">
            <kbd>↓</kbd>
            <span>Volume Down</span>
          </div>
          <div className="audio-demo__shortcut">
            <kbd>M</kbd>
            <span>Toggle Mute</span>
          </div>
          <div className="audio-demo__shortcut">
            <kbd>Ctrl</kbd> + <kbd>S</kbd>
            <span>Stop</span>
          </div>
          <div className="audio-demo__shortcut">
            <kbd>Esc</kbd>
            <span>Clear Error</span>
          </div>
        </div>
      </div>

      {/* Notifications */}
      {notifications.length > 0 && (
        <div className="audio-demo__notifications">
          <div className="audio-demo__notifications-header">
            <h3>Activity Log</h3>
            <button onClick={clearNotifications} className="audio-demo__clear-btn">
              Clear
            </button>
          </div>
          <ul className="audio-demo__notifications-list">
            {notifications.map((notification, index) => (
              <li
                key={index}
                className={`audio-demo__notification ${
                  notification.startsWith('ERROR') ? 'audio-demo__notification--error' : ''
                }`}
              >
                {notification}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Technical Notes */}
      <div className="audio-demo__notes">
        <h2 className="audio-demo__section-title">Technical Implementation</h2>
        <div className="audio-demo__note">
          <h3>Web Audio API</h3>
          <p>
            Primary audio implementation uses the Web Audio API for advanced features like
            real-time visualization, audio effects, and precise timing control.
          </p>
        </div>
        <div className="audio-demo__note">
          <h3>HTML5 Audio Fallback</h3>
          <p>
            Automatic fallback to HTML5 Audio element ensures compatibility with older
            browsers and environments where Web Audio API is not available.
          </p>
        </div>
        <div className="audio-demo__note">
          <h3>Performance Optimized</h3>
          <p>
            Audio caching, buffer management, and efficient event handling ensure smooth
            playback even with multiple tracks and long listening sessions.
          </p>
        </div>
        <div className="audio-demo__note">
          <h3>Error Handling</h3>
          <p>
            Comprehensive error handling with recovery strategies for network issues,
            format problems, and device limitations.
          </p>
        </div>
      </div>
    </div>
  );
};

export default AudioDemo;