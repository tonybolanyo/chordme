import React, { useState, useEffect } from 'react';
import './ForumHome.css';

interface ForumCategory {
  id: number;
  name: string;
  description: string;
  slug: string;
  color: string;
  icon?: string;
  thread_count: number;
  post_count: number;
  last_activity_at: string | null;
}

interface ForumHomeProps {
  className?: string;
}

const ForumHome: React.FC<ForumHomeProps> = ({ className = '' }) => {
  const [categories, setCategories] = useState<ForumCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchCategories();
  }, []);

  const fetchCategories = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await fetch('/api/v1/forum/categories');
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      if (data.status === 'success') {
        setCategories(data.data.categories);
      } else {
        throw new Error(data.error || 'Failed to fetch categories');
      }
    } catch (err) {
      console.error('Error fetching forum categories:', err);
      setError(err instanceof Error ? err.message : 'Unknown error occurred');
    } finally {
      setLoading(false);
    }
  };

  const formatRelativeTime = (dateString: string | null): string => {
    if (!dateString) return 'Never';
    
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMinutes = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMinutes / 60);
    const diffDays = Math.floor(diffHours / 24);
    
    if (diffMinutes < 1) return 'Just now';
    if (diffMinutes < 60) return `${diffMinutes} minutes ago`;
    if (diffHours < 24) return `${diffHours} hours ago`;
    if (diffDays < 7) return `${diffDays} days ago`;
    
    return date.toLocaleDateString();
  };

  const handleCategoryClick = (category: ForumCategory) => {
    // Navigate to category page - would use router in real app
    window.location.href = `/forum/categories/${category.slug}`;
  };

  if (loading) {
    return (
      <div className={`forum-home ${className}`}>
        <div className="forum-home__loading">
          <div className="loading-spinner" aria-label="Loading forum categories"></div>
          <p>Loading forum categories...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`forum-home ${className}`}>
        <div className="forum-home__error">
          <div className="error-icon">⚠️</div>
          <h3>Unable to load forum</h3>
          <p>{error}</p>
          <button 
            onClick={fetchCategories}
            className="retry-button"
            type="button"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={`forum-home ${className}`}>
      <div className="forum-home__header">
        <h1>Community Forum</h1>
        <p className="forum-home__description">
          Connect with fellow ChordMe users, share tips, ask questions, and discuss music.
        </p>
      </div>

      <div className="forum-categories">
        <h2 className="forum-categories__title">Discussion Categories</h2>
        
        {categories.length === 0 ? (
          <div className="forum-categories__empty">
            <div className="empty-icon">💬</div>
            <h3>No categories yet</h3>
            <p>The forum is being set up. Check back soon!</p>
          </div>
        ) : (
          <div className="categories-grid">
            {categories.map((category) => (
              <div
                key={category.id}
                className="category-card"
                onClick={() => handleCategoryClick(category)}
                role="button"
                tabIndex={0}
                onKeyPress={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    handleCategoryClick(category);
                  }
                }}
              >
                <div className="category-card__header">
                  <div 
                    className="category-card__icon"
                    style={{ backgroundColor: category.color }}
                  >
                    {category.icon || '💬'}
                  </div>
                  <div className="category-card__info">
                    <h3 className="category-card__name">{category.name}</h3>
                    <p className="category-card__description">{category.description}</p>
                  </div>
                </div>
                
                <div className="category-card__stats">
                  <div className="stat">
                    <span className="stat__value">{category.thread_count}</span>
                    <span className="stat__label">Threads</span>
                  </div>
                  <div className="stat">
                    <span className="stat__value">{category.post_count}</span>
                    <span className="stat__label">Posts</span>
                  </div>
                </div>
                
                <div className="category-card__activity">
                  <span className="activity-label">Last activity:</span>
                  <span className="activity-time">
                    {formatRelativeTime(category.last_activity_at)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="forum-home__actions">
        <button 
          className="action-button primary"
          onClick={() => {
            // Would navigate to new thread creation
            console.log('Navigate to create new thread');
          }}
          type="button"
        >
          Start New Discussion
        </button>
        
        <button 
          className="action-button secondary"
          onClick={() => {
            // Would navigate to search
            console.log('Navigate to forum search');
          }}
          type="button"
        >
          Search Forum
        </button>
      </div>
    </div>
  );
};

export default ForumHome;