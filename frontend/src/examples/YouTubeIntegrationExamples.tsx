/**
 * YouTube Integration Demo/Example
 * Shows how to integrate YouTube functionality into existing components
 */

import React, { useState } from 'react';
import { YouTubeIntegration } from '../components';
import type { Song } from '../types';

// Example of how to add YouTube integration to an existing song component
const SongWithYouTube: React.FC<{ song: Song }> = ({ song }) => {
  const [error, setError] = useState<string | null>(null);

  const handleYouTubeError = (errorMessage: string) => {
    setError(errorMessage);
    console.error('YouTube integration error:', errorMessage);
  };

  return (
    <div className="song-with-youtube">
      {/* Existing song content */}
      <div className="song-content">
        <h2>{song.title}</h2>
        <div className="chordpro-content">
          {/* ChordPro content would go here */}
          <pre>{song.content}</pre>
        </div>
      </div>

      {/* YouTube integration */}
      <div className="youtube-section">
        <YouTubeIntegration
          song={song}
          onError={handleYouTubeError}
          autoSearch={true}
          syncEnabled={true}
          compact={false}
        />
      </div>

      {/* Error display */}
      {error && (
        <div className="error-message">
          <p>YouTube Error: {error}</p>
          <button onClick={() => setError(null)}>Dismiss</button>
        </div>
      )}
    </div>
  );
};

// Example of compact YouTube integration for list views
const SongListItemWithYouTube: React.FC<{ song: Song }> = ({ song }) => {
  return (
    <div className="song-list-item">
      {/* Song info */}
      <div className="song-info">
        <h3>{song.title}</h3>
        <p>Created: {new Date(song.created_at).toLocaleDateString()}</p>
      </div>

      {/* Compact YouTube integration */}
      <div className="youtube-preview">
        <YouTubeIntegration
          song={song}
          compact={true}
          autoSearch={false}
          className="compact-youtube"
        />
      </div>
    </div>
  );
};

// Example of YouTube integration in a modal/popup
const YouTubeModal: React.FC<{ 
  song: Song; 
  isOpen: boolean; 
  onClose: () => void;
}> = ({ song, isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>YouTube Integration for "{song.title}"</h2>
          <button className="close-button" onClick={onClose}>×</button>
        </div>
        
        <div className="modal-body">
          <YouTubeIntegration
            song={song}
            autoSearch={true}
            syncEnabled={true}
          />
        </div>
      </div>
    </div>
  );
};

// Example CSS for the examples above
const exampleCSS = `
.song-with-youtube {
  display: flex;
  gap: 20px;
  padding: 20px;
  max-width: 1200px;
  margin: 0 auto;
}

.song-content {
  flex: 1;
  min-width: 0;
}

.youtube-section {
  flex: 0 0 400px;
}

.chordpro-content {
  background: #f5f5f5;
  padding: 16px;
  border-radius: 8px;
  margin-top: 16px;
}

.chordpro-content pre {
  margin: 0;
  white-space: pre-wrap;
  font-family: 'Courier New', monospace;
}

.song-list-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px;
  border-bottom: 1px solid #eee;
}

.song-info {
  flex: 1;
}

.youtube-preview {
  flex: 0 0 200px;
}

.compact-youtube {
  max-width: 200px;
}

.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.7);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.modal-content {
  background: white;
  border-radius: 12px;
  max-width: 90vw;
  max-height: 90vh;
  overflow: hidden;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.3);
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px;
  border-bottom: 1px solid #eee;
}

.modal-header h2 {
  margin: 0;
  font-size: 18px;
}

.close-button {
  background: none;
  border: none;
  font-size: 24px;
  cursor: pointer;
  color: #666;
  width: 30px;
  height: 30px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  transition: background-color 0.2s;
}

.close-button:hover {
  background: #f0f0f0;
}

.modal-body {
  padding: 20px;
  max-height: 70vh;
  overflow-y: auto;
}

.error-message {
  background: #ffebee;
  border: 1px solid #ffcdd2;
  border-radius: 6px;
  padding: 12px;
  margin-top: 16px;
  color: #c62828;
}

.error-message button {
  background: none;
  border: none;
  color: #c62828;
  text-decoration: underline;
  cursor: pointer;
  margin-left: 8px;
}

/* Responsive design */
@media (max-width: 768px) {
  .song-with-youtube {
    flex-direction: column;
    padding: 16px;
  }
  
  .youtube-section {
    flex: none;
  }
  
  .song-list-item {
    flex-direction: column;
    align-items: flex-start;
    gap: 12px;
  }
  
  .youtube-preview {
    flex: none;
    align-self: stretch;
  }
  
  .modal-content {
    margin: 20px;
    max-width: calc(100vw - 40px);
  }
}
`;

export {
  SongWithYouTube,
  SongListItemWithYouTube,
  YouTubeModal,
  exampleCSS
};

// Usage examples for developers:

/*
1. Full Integration in Song View:
   <SongWithYouTube song={currentSong} />

2. Compact Integration in Lists:
   {songs.map(song => (
     <SongListItemWithYouTube key={song.id} song={song} />
   ))}

3. Modal Integration:
   <YouTubeModal 
     song={selectedSong} 
     isOpen={showYouTubeModal} 
     onClose={() => setShowYouTubeModal(false)} 
   />

4. Custom Integration:
   <YouTubeIntegration
     song={song}
     autoSearch={true}        // Automatically search for videos
     syncEnabled={true}       // Enable chord synchronization
     compact={false}          // Full-size interface
     className="custom-class" // Custom styling
     onError={handleError}    // Error handling
   />

5. Environment Setup:
   Add to .env:
   VITE_YOUTUBE_API_KEY=your_youtube_api_key_here
   
   Backend .env:
   YOUTUBE_API_KEY=your_youtube_api_key_here

6. API Endpoints Available:
   POST /api/v1/youtube/search - Search videos
   GET /api/v1/youtube/video/{id} - Get video details
   POST /api/v1/songs/{id}/youtube - Link video to song
   GET /api/v1/songs/{id}/youtube - Get linked video data
   DELETE /api/v1/songs/{id}/youtube - Unlink video
   GET /api/v1/youtube/suggest/{id} - Get video suggestions

7. Features:
   - Video search with filters
   - Automatic video suggestions
   - Song-to-video linking
   - Chord synchronization framework
   - Responsive design
   - Error handling
   - Rate limiting
   - Authentication required
*/