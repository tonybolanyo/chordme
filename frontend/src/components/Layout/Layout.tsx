import React from 'react';
import Header from '../Header';
import './Layout.css';

interface LayoutProps {
  children: React.ReactNode;
}

const Layout: React.FC<LayoutProps> = ({ children }) => {
  return (
    <div className="layout">
      {/* Skip navigation link for screen readers */}
      <a href="#main-content" className="skip-nav">
        Skip to main content
      </a>

      <Header />

      <main
        id="main-content"
        className="main-content"
        role="main"
        aria-label="Main content"
      >
        {children}
      </main>

      <footer className="footer" role="contentinfo" aria-label="Site footer">
        <p>&copy; 2024 ChordMe. Lyrics and chords in a simple way.</p>
      </footer>
    </div>
  );
};

export default Layout;
