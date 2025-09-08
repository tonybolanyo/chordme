import React, { useState, useEffect } from 'react';
import './ThreadList.css';

interface Author {
  id: number;
  display_name: string;
  profile_image_url?: string;
}

interface ForumThread {
  id: number;
  title: string;
  slug: string;
  thread_type: 'discussion' | 'question' | 'announcement' | 'feature_request';
  tags: string[];
  author_id: number;
  category_id: number;
  is_locked: boolean;
  is_pinned: boolean;
  is_solved: boolean;
  view_count: number;
  post_count: number;
  participant_count: number;
  vote_score: number;
  last_activity_at: string;
  created_at: string;
  author?: Author;
}

interface Category {
  id: number;
  name: string;
  slug: string;
  color: string;
}

interface ThreadListProps {
  categorySlug?: string;
  className?: string;
}

const ThreadList: React.FC<ThreadListProps> = ({ categorySlug, className = '' }) => {
  const [threads, setThreads] = useState<ForumThread[]>([]);
  const [category, setCategory] = useState<Category | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<'recent' | 'popular' | 'oldest'>('recent');
  const [threadType, setThreadType] = useState<string>('');

  useEffect(() => {
    if (categorySlug) {
      fetchThreads();
    }
  }, [categorySlug, sortBy, threadType]);

  const fetchThreads = async () => {
    if (!categorySlug) return;
    
    try {
      setLoading(true);
      setError(null);
      
      const params = new URLSearchParams({
        sort: sortBy,
        ...(threadType && { thread_type: threadType })
      });
      
      const response = await fetch(`/api/v1/forum/categories/${categorySlug}/threads?${params}`);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      if (data.status === 'success') {
        setThreads(data.data.threads);
        setCategory(data.data.category);
      } else {
        throw new Error(data.error || 'Failed to fetch threads');
      }
    } catch (err) {
      console.error('Error fetching threads:', err);
      setError(err instanceof Error ? err.message : 'Unknown error occurred');
    } finally {
      setLoading(false);
    }
  };

  const formatRelativeTime = (dateString: string): string => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMinutes = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMinutes / 60);
    const diffDays = Math.floor(diffHours / 24);
    
    if (diffMinutes < 1) return 'Just now';
    if (diffMinutes < 60) return `${diffMinutes}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    
    return date.toLocaleDateString();
  };

  const getThreadTypeIcon = (type: string): string => {
    switch (type) {
      case 'question': return '❓';
      case 'announcement': return '📢';
      case 'feature_request': return '💡';
      default: return '💬';
    }
  };

  const getThreadTypeLabel = (type: string): string => {
    switch (type) {
      case 'question': return 'Question';
      case 'announcement': return 'Announcement';
      case 'feature_request': return 'Feature Request';
      default: return 'Discussion';
    }
  };

  const handleThreadClick = (thread: ForumThread) => {
    // Navigate to thread detail - would use router in real app
    window.location.href = `/forum/threads/${thread.id}`;
  };

  if (loading) {
    return (
      <div className={`thread-list ${className}`}>
        <div className="thread-list__loading">
          <div className="loading-spinner" aria-label="Loading threads"></div>
          <p>Loading threads...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`thread-list ${className}`}>
        <div className="thread-list__error">
          <div className="error-icon">⚠️</div>
          <h3>Unable to load threads</h3>
          <p>{error}</p>
          <button 
            onClick={fetchThreads}
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
    <div className={`thread-list ${className}`}>
      <div className="thread-list__header">
        {category && (
          <div className="category-info">
            <div 
              className="category-info__icon"
              style={{ backgroundColor: category.color }}
            >
              💬
            </div>
            <div className="category-info__details">
              <h1 className="category-info__name">{category.name}</h1>
              <p className="category-info__breadcrumb">
                <a href="/forum">Forum</a> / {category.name}
              </p>
            </div>
          </div>
        )}
        
        <div className="thread-list__controls">
          <div className="controls-group">
            <select 
              value={sortBy} 
              onChange={(e) => setSortBy(e.target.value as 'recent' | 'popular' | 'oldest')}
              className="control-select"
            >
              <option value="recent">Most Recent</option>
              <option value="popular">Most Popular</option>
              <option value="oldest">Oldest First</option>
            </select>
            
            <select 
              value={threadType} 
              onChange={(e) => setThreadType(e.target.value)}
              className="control-select"
            >
              <option value="">All Types</option>
              <option value="discussion">Discussions</option>
              <option value="question">Questions</option>
              <option value="announcement">Announcements</option>
              <option value="feature_request">Feature Requests</option>
            </select>
          </div>
          
          <button 
            className="create-thread-button"
            onClick={() => {
              // Would navigate to thread creation
              console.log('Navigate to create thread');
            }}
            type="button"
          >
            + New Thread
          </button>
        </div>
      </div>

      <div className="threads-container">
        {threads.length === 0 ? (
          <div className="threads-empty">
            <div className="empty-icon">💭</div>
            <h3>No threads yet</h3>
            <p>Be the first to start a discussion in this category!</p>
            <button 
              className="create-first-thread"
              onClick={() => {
                console.log('Navigate to create thread');
              }}
              type="button"
            >
              Start Discussion
            </button>
          </div>
        ) : (
          <div className="threads-list">
            {threads.map((thread) => (
              <div
                key={thread.id}
                className={`thread-item ${thread.is_pinned ? 'thread-item--pinned' : ''} ${thread.is_locked ? 'thread-item--locked' : ''}`}
                onClick={() => handleThreadClick(thread)}
                role="button"
                tabIndex={0}
                onKeyPress={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    handleThreadClick(thread);
                  }
                }}
              >
                <div className="thread-item__main">
                  <div className="thread-item__indicators">
                    {thread.is_pinned && (
                      <span className="indicator indicator--pinned" title="Pinned">📌</span>
                    )}
                    {thread.is_locked && (
                      <span className="indicator indicator--locked" title="Locked">🔒</span>
                    )}
                    {thread.is_solved && (
                      <span className="indicator indicator--solved" title="Solved">✅</span>
                    )}
                    <span className="thread-type-icon" title={getThreadTypeLabel(thread.thread_type)}>
                      {getThreadTypeIcon(thread.thread_type)}
                    </span>
                  </div>
                  
                  <div className="thread-item__content">
                    <h3 className="thread-item__title">{thread.title}</h3>
                    
                    {thread.tags.length > 0 && (
                      <div className="thread-item__tags">
                        {thread.tags.map((tag, index) => (
                          <span key={index} className="tag">{tag}</span>
                        ))}
                      </div>
                    )}
                    
                    <div className="thread-item__meta">
                      <span className="meta-item">
                        by {thread.author?.display_name || `User ${thread.author_id}`}
                      </span>
                      <span className="meta-item">
                        {formatRelativeTime(thread.created_at)}
                      </span>
                      <span className="meta-item">
                        Last activity: {formatRelativeTime(thread.last_activity_at)}
                      </span>
                    </div>
                  </div>
                </div>
                
                <div className="thread-item__stats">
                  <div className="stat">
                    <span className="stat__value">{thread.vote_score}</span>
                    <span className="stat__label">Votes</span>
                  </div>
                  <div className="stat">
                    <span className="stat__value">{thread.post_count}</span>
                    <span className="stat__label">Posts</span>
                  </div>
                  <div className="stat">
                    <span className="stat__value">{thread.view_count}</span>
                    <span className="stat__label">Views</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default ThreadList;