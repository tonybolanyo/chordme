import React from 'react';
import Header from '../Header';
import './Layout.css';

interface LayoutProps {
  children: React.ReactNode;
}

const Layout: React.FC<LayoutProps> = ({ children }) => {
  return (
    <div className="layout">
      <Header />
      <main className="main-content">{children}</main>
      <footer className="footer">
        <p>&copy; 2024 ChordMe. Lyrics and chords in a simple way.</p>
      </footer>
    </div>
  );
};

export default Layout;
