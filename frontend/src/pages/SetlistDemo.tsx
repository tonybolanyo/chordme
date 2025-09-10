/**
 * SetlistDemo - Demo component to showcase setlist functionality
 */

import React, { useState } from 'react';
import { I18nextProvider } from 'react-i18next';
import { SetlistBuilder } from '../components/SetlistBuilder';
import i18n from '../i18n/config';
import './SetlistDemo.css';

// Mock data for demonstration
const mockSetlist = {
  id: 'demo-setlist',
  name: 'Sunday Morning Worship - Demo',
  description: 'A sample setlist showcasing the drag-and-drop interface',
  user_id: 'demo-user',
  event_type: 'worship' as const,
  venue: 'Main Sanctuary',
  event_date: '2024-01-21T10:00:00Z',
  estimated_duration: 45,
  is_template: false,
  is_public: false,
  is_recurring: false,
  status: 'draft' as const,
  is_deleted: false,
  is_archived: false,
  tags: ['contemporary', 'worship'],
  view_count: 0,
  usage_count: 0,
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-15T00:00:00Z',
  songs: [
    {
      id: 'demo-setlist-song-1',
      setlist_id: 'demo-setlist',
      song_id: 'demo-song-1',
      sort_order: 1,
      section: 'opening',
      performance_key: 'G',
      performance_tempo: 120,
      is_optional: false,
      is_highlight: true,
      requires_preparation: false,
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-01T00:00:00Z'
    },
    {
      id: 'demo-setlist-song-2',
      setlist_id: 'demo-setlist',
      song_id: 'demo-song-2',
      sort_order: 2,
      section: 'main',
      performance_key: 'C',
      performance_tempo: 130,
      is_optional: false,
      is_highlight: false,
      requires_preparation: false,
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-01T00:00:00Z'
    }
  ]
};

const mockSongs = [
  {
    id: 'demo-song-1',
    title: 'Amazing Grace',
    artist: 'Traditional',
    key: 'G',
    tempo: 120,
    duration: 240,
    tags: ['hymn', 'traditional']
  },
  {
    id: 'demo-song-2',
    title: 'How Great Is Our God',
    artist: 'Chris Tomlin',
    key: 'C',
    tempo: 130,
    duration: 300,
    tags: ['contemporary', 'praise']
  },
  {
    id: 'demo-song-3',
    title: '10,000 Reasons',
    artist: 'Matt Redman',
    key: 'A',
    tempo: 110,
    duration: 280,
    tags: ['contemporary', 'worship']
  },
  {
    id: 'demo-song-4',
    title: 'Blessed Be Your Name',
    artist: 'Tree63',
    key: 'D',
    tempo: 140,
    duration: 320,
    tags: ['contemporary', 'praise']
  },
  {
    id: 'demo-song-5',
    title: 'Holy Holy Holy',
    artist: 'Traditional',
    key: 'F',
    tempo: 90,
    duration: 200,
    tags: ['hymn', 'traditional']
  }
];

// Mock the setlist service
const mockSetlistService = {
  getSetlist: async () => mockSetlist,
  createSetlist: async () => mockSetlist,
  searchSongs: async (query: string) => {
    if (!query) return mockSongs;
    return mockSongs.filter(song => 
      song.title.toLowerCase().includes(query.toLowerCase()) ||
      song.artist.toLowerCase().includes(query.toLowerCase())
    );
  },
  addSongToSetlist: async () => ({
    id: 'new-demo-song',
    setlist_id: 'demo-setlist',
    song_id: 'demo-song-3',
    sort_order: 3,
    section: 'main',
    is_optional: false,
    is_highlight: false,
    requires_preparation: false,
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z'
  })
};

// Mock the service module
React.createElement(() => {
  (global as unknown).mockSetlistService = mockSetlistService;
  return null;
});

export const SetlistDemo: React.FC = () => {
  const [showDemo, setShowDemo] = useState(false);

  const handleStartDemo = () => {
    setShowDemo(true);
  };

  const handleSave = () => {
    alert('Setlist saved! (This is a demo)');
  };

  const handleCancel = () => {
    setShowDemo(false);
  };

  if (!showDemo) {
    return (
      <div className="setlist-demo-intro">
        <div className="demo-container">
          <h1>Setlist Builder Demo</h1>
          <p>
            Experience the powerful drag-and-drop setlist builder for ChordMe. 
            This demo showcases the intuitive interface for creating and organizing 
            musical setlists with songs, sections, and performance notes.
          </p>
          
          <div className="demo-features">
            <h2>Features Demonstrated:</h2>
            <ul>
              <li>✨ Drag-and-drop song organization</li>
              <li>🎵 Song search and filtering</li>
              <li>📱 Mobile-responsive design</li>
              <li>♿ Accessibility features</li>
              <li>🌍 Internationalization support</li>
              <li>🎭 Visual feedback and animations</li>
            </ul>
          </div>

          <div className="demo-instructions">
            <h2>Try It Out:</h2>
            <ol>
              <li>Drag songs from the library to different sections</li>
              <li>Search for specific songs using the search box</li>
              <li>See visual feedback during drag operations</li>
              <li>Experience the responsive design on different screen sizes</li>
            </ol>
          </div>

          <button onClick={handleStartDemo} className="demo-start-btn">
            Launch Setlist Builder Demo
          </button>
        </div>
      </div>
    );
  }

  return (
    <I18nextProvider i18n={i18n}>
      <div className="setlist-demo">
        <SetlistBuilder
          setlistId="demo-setlist"
          onSave={handleSave}
          onCancel={handleCancel}
          readOnly={false}
        />
      </div>
    </I18nextProvider>
  );
};