import React from 'react';
import './Header.css';

interface HeaderProps {
  title?: string;
}

const Header: React.FC<HeaderProps> = ({ title = 'ChordMe' }) => {
  return (
    <header className="header">
      <div className="header-container">
        <h1 className="header-title">{title}</h1>
        <nav className="header-nav">
          <a href="/" className="nav-link">
            Home
          </a>
          <a href="/songs" className="nav-link">
            Songs
          </a>
          <a href="/chords" className="nav-link">
            Chords
          </a>
        </nav>
      </div>
    </header>
  );
};

export default Header;
