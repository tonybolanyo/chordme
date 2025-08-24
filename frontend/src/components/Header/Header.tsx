import React, { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { StorageIndicator, StorageSettings } from '../';
import { apiService } from '../../services/api';
import './Header.css';

interface HeaderProps {
  title?: string;
}

const Header: React.FC<HeaderProps> = ({ title = 'ChordMe' }) => {
  const { isAuthenticated, user, logout } = useAuth();
  const [showStorageSettings, setShowStorageSettings] = useState(false);

  const handleLogout = () => {
    logout();
  };

  const handleStorageSettingsOpen = () => {
    setShowStorageSettings(true);
  };

  const handleStorageSettingsClose = () => {
    setShowStorageSettings(false);
  };

  const handleBackendChange = (backendId: string) => {
    apiService.setStorageBackend(backendId as any);
    setShowStorageSettings(false);
    // You might want to trigger a refresh or reload here
    // For now, let's just close the settings
  };

  return (
    <header className="header">
      <div className="header-container">
        <h1 className="header-title">
          <a href="#home" style={{ textDecoration: 'none', color: 'inherit' }}>
            {title}
          </a>
        </h1>
        <nav className="header-nav">
          {isAuthenticated ? (
            <>
              <a href="#home" className="nav-link">
                Home
              </a>
              <a href="#songs" className="nav-link">
                Songs
              </a>
              <div className="auth-links">
                <StorageIndicator onClick={handleStorageSettingsOpen} />
                <span className="user-info">Welcome, {user?.email}</span>
                <button
                  onClick={handleLogout}
                  className="nav-link auth-link btn-logout"
                >
                  Logout
                </button>
              </div>
            </>
          ) : (
            <>
              <a href="#demo" className="nav-link">
                Demo
              </a>
              <div className="auth-links">
                <StorageIndicator onClick={handleStorageSettingsOpen} />
                <a href="#login" className="nav-link auth-link">
                  Login
                </a>
                <a href="#register" className="nav-link auth-link btn-register">
                  Sign Up
                </a>
              </div>
            </>
          )}
        </nav>
      </div>
      
      {showStorageSettings && (
        <StorageSettings
          currentBackend={apiService.getCurrentBackend()}
          onBackendChange={handleBackendChange}
          onClose={handleStorageSettingsClose}
        />
      )}
    </header>
  );
};

export default Header;
