import React from 'react';
import './Home.css';

const Home: React.FC = () => {
  return (
    <div className="home">
      <div className="home-hero">
        <h1>Welcome to ChordMe</h1>
        <p className="home-subtitle">Lyrics and chords in a simple way</p>
        <div className="home-actions">
          <button className="btn btn-primary">Browse Songs</button>
          <button className="btn btn-secondary">Create New Song</button>
        </div>
      </div>

      <div className="home-features">
        <div className="feature">
          <h3>Easy Chord Management</h3>
          <p>
            Add and manage chords for your favorite songs with an intuitive
            interface.
          </p>
        </div>
        <div className="feature">
          <h3>Lyrics Integration</h3>
          <p>
            Seamlessly combine lyrics with chord progressions for complete
            songs.
          </p>
        </div>
        <div className="feature">
          <h3>Simple & Clean</h3>
          <p>Focus on your music with a clean, distraction-free interface.</p>
        </div>
      </div>
    </div>
  );
};

export default Home;
