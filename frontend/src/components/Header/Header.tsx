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
          <a href="#home" className="nav-link">
            Home
          </a>
          <a href="/songs" className="nav-link">
            Songs
          </a>
          <a href="/chords" className="nav-link">
            Chords
          </a>
          <div className="auth-links">
            <a href="#login" className="nav-link auth-link">
              Login
            </a>
            <a href="#register" className="nav-link auth-link btn-register">
              Sign Up
            </a>
          </div>
        </nav>
      </div>
    </header>
  );
};

export default Header;
