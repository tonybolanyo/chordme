import React from 'react';
import './ForumNavigation.css';

interface ForumNavigationProps {
  currentPath?: string;
  userReputation?: {
    total_score: number;
    level: number;
    level_name: string;
  };
  className?: string;
}

const ForumNavigation: React.FC<ForumNavigationProps> = ({ 
  currentPath = '',
  userReputation,
  className = ''
}) => {
  const navigationItems = [
    { 
      label: 'Home', 
      path: '/forum', 
      icon: '🏠',
      description: 'Forum homepage'
    },
    { 
      label: 'Discussions', 
      path: '/forum/discussions', 
      icon: '💬',
      description: 'General discussions'
    },
    { 
      label: 'Questions', 
      path: '/forum/questions', 
      icon: '❓',
      description: 'Questions and answers'
    },
    { 
      label: 'Feature Requests', 
      path: '/forum/features', 
      icon: '💡',
      description: 'Feature requests and ideas'
    },
    { 
      label: 'Search', 
      path: '/forum/search', 
      icon: '🔍',
      description: 'Search forum content'
    }
  ];

  const isActive = (path: string): boolean => {
    return currentPath === path || currentPath.startsWith(path + '/');
  };

  const handleNavigation = (path: string) => {
    // Would use router in real app
    window.location.href = path;
  };

  return (
    <nav className={`forum-navigation ${className}`} role="navigation" aria-label="Forum navigation">
      <div className="forum-navigation__main">
        <h2 className="forum-navigation__title">Forum</h2>
        
        <ul className="navigation-list" role="menubar">
          {navigationItems.map((item) => (
            <li key={item.path} className="navigation-item" role="none">
              <button
                className={`navigation-link ${isActive(item.path) ? 'navigation-link--active' : ''}`}
                onClick={() => handleNavigation(item.path)}
                role="menuitem"
                aria-current={isActive(item.path) ? 'page' : undefined}
                title={item.description}
                type="button"
              >
                <span className="navigation-icon" aria-hidden="true">
                  {item.icon}
                </span>
                <span className="navigation-label">{item.label}</span>
              </button>
            </li>
          ))}
        </ul>
      </div>

      {userReputation && (
        <div className="forum-navigation__user-info">
          <div className="user-reputation">
            <div className="reputation-header">
              <span className="reputation-icon">🌟</span>
              <span className="reputation-title">Your Reputation</span>
            </div>
            
            <div className="reputation-stats">
              <div className="reputation-score">
                <span className="score-value">{userReputation.total_score}</span>
                <span className="score-label">Points</span>
              </div>
              
              <div className="reputation-level">
                <span className="level-value">Level {userReputation.level}</span>
                <span className="level-name">{userReputation.level_name}</span>
              </div>
            </div>
            
            <button 
              className="reputation-details-button"
              onClick={() => handleNavigation('/forum/reputation')}
              type="button"
            >
              View Details
            </button>
          </div>
        </div>
      )}

      <div className="forum-navigation__quick-actions">
        <h3 className="quick-actions__title">Quick Actions</h3>
        
        <div className="quick-actions__buttons">
          <button
            className="quick-action-button quick-action-button--primary"
            onClick={() => handleNavigation('/forum/new-thread')}
            type="button"
          >
            <span className="button-icon">✏️</span>
            <span className="button-text">New Thread</span>
          </button>
          
          <button
            className="quick-action-button quick-action-button--secondary"
            onClick={() => handleNavigation('/forum/my-activity')}
            type="button"
          >
            <span className="button-icon">📊</span>
            <span className="button-text">My Activity</span>
          </button>
          
          <button
            className="quick-action-button quick-action-button--secondary"
            onClick={() => handleNavigation('/forum/badges')}
            type="button"
          >
            <span className="button-icon">🏆</span>
            <span className="button-text">Badges</span>
          </button>
        </div>
      </div>

      <div className="forum-navigation__help">
        <h3 className="help-title">Need Help?</h3>
        <p className="help-text">
          Check out our community guidelines and FAQ for tips on using the forum.
        </p>
        <div className="help-links">
          <button
            className="help-link"
            onClick={() => handleNavigation('/forum/guidelines')}
            type="button"
          >
            Community Guidelines
          </button>
          <button
            className="help-link"
            onClick={() => handleNavigation('/forum/faq')}
            type="button"
          >
            FAQ
          </button>
        </div>
      </div>
    </nav>
  );
};

export default ForumNavigation;