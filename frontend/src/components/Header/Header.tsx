import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../contexts/AuthContext';
import { StorageIndicator, StorageSettings, LanguageSwitcher } from '../';
import { apiService } from '../../services/api';
import { useViewport } from '../../utils/responsive';
import './Header.css';

interface HeaderProps {
  title?: string;
}

const Header: React.FC<HeaderProps> = ({ title }) => {
  const { t } = useTranslation('common');
  const { isAuthenticated, user, logout } = useAuth();
  const [showStorageSettings, setShowStorageSettings] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { isMobile } = useViewport();

  // Use translated title if no title prop provided
  const headerTitle = title || t('app.title');

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
            {t('navigation.home')}
          </a>
          <a href="#songs" className="nav-link" onClick={closeMobileMenu}>
            {t('navigation.songs')}
          </a>
          <a href="#profile" className="nav-link" onClick={closeMobileMenu}>
            {t('navigation.profile')}
          </a>
          <div className="auth-links">
            <StorageIndicator onClick={handleStorageSettingsOpen} />
            <span className="user-info">{t('navigation.welcome', { email: user?.email })}</span>
            <button
              onClick={handleLogout}
              className="nav-link auth-link btn-logout touch-target"
            >
              {t('navigation.logout')}
            </button>
          </div>
        </>
      );
    } else {
      return (
        <>
          <a href="#demo" className="nav-link" onClick={closeMobileMenu}>
            {t('navigation.demo')}
          </a>
          <div className="auth-links">
            <StorageIndicator onClick={handleStorageSettingsOpen} />
            <a
              href="#login"
              className="nav-link auth-link"
              onClick={closeMobileMenu}
            >
              {t('navigation.login')}
            </a>
            <a
              href="#register"
              className="nav-link auth-link btn-register"
              onClick={closeMobileMenu}
            >
              {t('navigation.register')}
            </a>
          </div>
        </>
      );
    }
  };

  return (
    <>
      <header className="header" role="banner">
        <div className="header-container">
          <div className="header-top">
            <h1 className="header-title">
              <a
                href="#home"
                style={{ textDecoration: 'none', color: 'white' }}
                aria-label={`${headerTitle} homepage`}
              >
                {headerTitle}
              </a>
            </h1>

            {/* Language Switcher - visible on desktop */}
            {!isMobile && <LanguageSwitcher />}

            {isMobile && (
              <button
                className="mobile-menu-toggle touch-target"
                onClick={toggleMobileMenu}
                aria-label={
                  mobileMenuOpen
                    ? t('accessibility.closeNavigation')
                    : t('accessibility.openNavigation')
                }
                aria-expanded={mobileMenuOpen}
                aria-controls="main-navigation"
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
            id="main-navigation"
            className={`header-nav ${isMobile ? 'mobile-nav' : ''} ${mobileMenuOpen ? 'open' : ''}`}
            role="navigation"
            aria-label="Main navigation"
            aria-hidden={isMobile && !mobileMenuOpen}
          >
            {renderNavLinks()}
            
            {/* Language Switcher - visible in mobile menu */}
            {isMobile && <LanguageSwitcher />}
          </nav>
        </div>

        {/* Mobile menu overlay */}
        {isMobile && mobileMenuOpen && (
          <div
            className="nav-overlay open"
            onClick={closeMobileMenu}
            aria-label={t('accessibility.closeNavigation')}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                closeMobileMenu();
              }
            }}
          ></div>
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
