import React from 'react';
import { useAuth } from '../../contexts/AuthContext';
import './Header.css';

interface HeaderProps {
  title?: string;
}

const Header: React.FC<HeaderProps> = ({ title = 'ChordMe' }) => {
  const { isAuthenticated, user, logout } = useAuth();

  const handleLogout = () => {
    logout();
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
                <span className="user-info">
                  Welcome, {user?.email}
                </span>
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
              <div className="auth-links">
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
    </header>
  );
};

export default Header;
