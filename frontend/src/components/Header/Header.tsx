import React, { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { StorageIndicator, StorageSettings } from '../';
import { apiService } from '../../services/api';
import { useViewport } from '../../utils/responsive';
import './Header.css';

interface HeaderProps {
  title?: string;
}

const Header: React.FC<HeaderProps> = ({ title = 'ChordMe' }) => {
  const { isAuthenticated, user, logout } = useAuth();
  const [showStorageSettings, setShowStorageSettings] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { isMobile } = useViewport();

  const handleLogout = () => {
    logout();
    setMobileMenuOpen(false);
  };

  const handleStorageSettingsOpen = () => {
    setShowStorageSettings(true);
  };

  const handleStorageSettingsClose = () => {
    setShowStorageSettings(false);
  };

  const handleBackendChange = (backendId: string) => {
    apiService.setStorageBackend(
      backendId as 'localstorage' | 'firebase' | 'googledrive'
    );
    setShowStorageSettings(false);
    // You might want to trigger a refresh or reload here
    // For now, let's just close the settings
  };

  const toggleMobileMenu = () => {
    setMobileMenuOpen(!mobileMenuOpen);
  };

  const closeMobileMenu = () => {
    setMobileMenuOpen(false);
  };

  const renderNavLinks = () => {
    if (isAuthenticated) {
      return (
        <>
          <a href="#home" className="nav-link" onClick={closeMobileMenu}>
            Home
          </a>
          <a href="#songs" className="nav-link" onClick={closeMobileMenu}>
            Songs
          </a>
          <div className="auth-links">
            <StorageIndicator onClick={handleStorageSettingsOpen} />
            <span className="user-info">Welcome, {user?.email}</span>
            <button
              onClick={handleLogout}
              className="nav-link auth-link btn-logout touch-target"
            >
              Logout
            </button>
          </div>
        </>
      );
    } else {
      return (
        <>
          <a href="#demo" className="nav-link" onClick={closeMobileMenu}>
            Demo
          </a>
          <div className="auth-links">
            <StorageIndicator onClick={handleStorageSettingsOpen} />
            <a
              href="#login"
              className="nav-link auth-link"
              onClick={closeMobileMenu}
            >
              Login
            </a>
            <a
              href="#register"
              className="nav-link auth-link btn-register"
              onClick={closeMobileMenu}
            >
              Sign Up
            </a>
          </div>
        </>
      );
    }
  };

  return (
    <>
      <header className="header">
        <div className="header-container">
          <div className="header-top">
            <h1 className="header-title">
              <a
                href="#home"
                style={{ textDecoration: 'none', color: 'inherit' }}
              >
                {title}
              </a>
            </h1>

            {isMobile && (
              <button
                className="mobile-menu-toggle touch-target"
                onClick={toggleMobileMenu}
                aria-label="Toggle navigation menu"
              >
                <span className={`hamburger ${mobileMenuOpen ? 'open' : ''}`}>
                  <span></span>
                  <span></span>
                  <span></span>
                </span>
              </button>
            )}
          </div>

          <nav
            className={`header-nav ${isMobile ? 'mobile-nav' : ''} ${mobileMenuOpen ? 'open' : ''}`}
          >
            {renderNavLinks()}
          </nav>
        </div>

        {/* Mobile menu overlay */}
        {isMobile && mobileMenuOpen && (
          <div className="nav-overlay open" onClick={closeMobileMenu}></div>
        )}
      </header>

      {showStorageSettings && (
        <StorageSettings
          currentBackend={apiService.getCurrentBackend()}
          onBackendChange={handleBackendChange}
          onClose={handleStorageSettingsClose}
        />
      )}
    </>
  );
};

export default Header;
