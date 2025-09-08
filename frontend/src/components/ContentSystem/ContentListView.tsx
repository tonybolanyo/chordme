import React, { useState, useEffect } from 'react';
import { contentService, ContentSubmission } from '../../services/contentService';
import './ContentListView.css';

interface ContentListViewProps {
  contentType?: string;
  featuredOnly?: boolean;
  searchQuery?: string;
  sortBy?: 'recent' | 'popular' | 'rating' | 'featured';
}

const ContentListView: React.FC<ContentListViewProps> = ({
  contentType,
  featuredOnly = false,
  searchQuery,
  sortBy = 'recent'
}) => {
  const [submissions, setSubmissions] = useState<ContentSubmission[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pagination, setPagination] = useState({
    page: 1,
    per_page: 12,
    total: 0,
    pages: 0,
    has_next: false,
    has_prev: false
  });

  const fetchContent = async (page: number = 1) => {
    setLoading(true);
    setError(null);

    try {
      const params = {
        page,
        per_page: pagination.per_page,
        ...(contentType && { content_type: contentType }),
        ...(featuredOnly && { featured_only: true }),
        sort_by: sortBy
      };

      let result;
      if (searchQuery) {
        result = await contentService.searchContent({
          ...params,
          q: searchQuery
        });
      } else {
        result = await contentService.getContentSubmissions(params);
      }

      setSubmissions(result.submissions);
      setPagination(result.pagination);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load content');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchContent(1);
  }, [contentType, featuredOnly, searchQuery, sortBy]);

  const handlePageChange = (page: number) => {
    fetchContent(page);
  };

  const handleVote = async (submissionId: number, voteType: 'upvote' | 'downvote') => {
    try {
      await contentService.voteOnContent(submissionId, voteType);
      // Refresh the specific submission
      await fetchContent(pagination.page);
    } catch (err) {
      console.error('Voting error:', err);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const getStatusBadge = (status: string) => {
    const statusClasses = {
      pending: 'status-pending',
      under_review: 'status-review',
      approved: 'status-approved',
      featured: 'status-featured',
      rejected: 'status-rejected'
    };

    return (
      <span className={`status-badge ${statusClasses[status as keyof typeof statusClasses] || 'status-default'}`}>
        {status.replace('_', ' ').toUpperCase()}
      </span>
    );
  };

  const getRatingStars = (rating: number) => {
    const stars = [];
    const fullStars = Math.floor(rating);
    const hasHalfStar = rating % 1 >= 0.5;

    for (let i = 0; i < fullStars; i++) {
      stars.push(<span key={i} className="star star-full">★</span>);
    }

    if (hasHalfStar) {
      stars.push(<span key="half" className="star star-half">★</span>);
    }

    const emptyStars = 5 - Math.ceil(rating);
    for (let i = 0; i < emptyStars; i++) {
      stars.push(<span key={`empty-${i}`} className="star star-empty">☆</span>);
    }

    return stars;
  };

  if (loading) {
    return (
      <div className="content-list-view">
        <div className="loading-container">
          <div className="loading-spinner"></div>
          <p>Loading content...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="content-list-view">
        <div className="error-container">
          <div className="error-icon">⚠️</div>
          <h3>Error Loading Content</h3>
          <p>{error}</p>
          <button onClick={() => fetchContent(pagination.page)} className="retry-button">
            Try Again
          </button>
        </div>
      </div>
    );
  }

  if (submissions.length === 0) {
    return (
      <div className="content-list-view">
        <div className="empty-state">
          <div className="empty-icon">🎵</div>
          <h3>No Content Found</h3>
          <p>
            {searchQuery
              ? `No content found matching "${searchQuery}"`
              : 'No content has been submitted yet. Be the first to share!'
            }
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="content-list-view">
      <div className="content-grid">
        {submissions.map((submission) => (
          <div key={submission.id} className="content-card">
            <div className="card-header">
              <div className="content-type-badge">
                {submission.content_type}
              </div>
              {submission.is_featured && (
                <div className="featured-badge">
                  ⭐ Featured
                </div>
              )}
            </div>

            <div className="card-content">
              <h3 className="content-title">
                <a href={`/content/${submission.id}`}>
                  {submission.title}
                </a>
              </h3>

              <p className="content-description">
                {submission.description.length > 120
                  ? `${submission.description.substring(0, 120)}...`
                  : submission.description
                }
              </p>

              <div className="content-metadata">
                {submission.content_data?.artist && (
                  <span className="metadata-item">
                    👤 {submission.content_data.artist}
                  </span>
                )}
                {submission.content_data?.genre && (
                  <span className="metadata-item">
                    🎼 {submission.content_data.genre}
                  </span>
                )}
                {submission.content_data?.key && (
                  <span className="metadata-item">
                    🎹 {submission.content_data.key}
                  </span>
                )}
                {submission.content_data?.difficulty && (
                  <span className="metadata-item">
                    📊 {submission.content_data.difficulty}
                  </span>
                )}
              </div>
            </div>

            <div className="card-stats">
              <div className="stats-row">
                <div className="stat-item">
                  <span className="stat-icon">👁️</span>
                  <span className="stat-value">{submission.view_count}</span>
                </div>
                <div className="stat-item">
                  <span className="stat-icon">💬</span>
                  <span className="stat-value">{submission.review_count}</span>
                </div>
                {submission.average_rating > 0 && (
                  <div className="rating-display">
                    {getRatingStars(submission.average_rating)}
                    <span className="rating-value">
                      {submission.average_rating.toFixed(1)}
                    </span>
                  </div>
                )}
              </div>

              <div className="voting-controls">
                <button
                  onClick={() => handleVote(submission.id, 'upvote')}
                  className="vote-button vote-up"
                  title="Upvote"
                >
                  ▲
                </button>
                <span className="vote-score">{submission.community_score}</span>
                <button
                  onClick={() => handleVote(submission.id, 'downvote')}
                  className="vote-button vote-down"
                  title="Downvote"
                >
                  ▼
                </button>
              </div>
            </div>

            <div className="card-footer">
              <div className="submission-info">
                <span className="submit-date">
                  {formatDate(submission.created_at)}
                </span>
                {getStatusBadge(submission.status)}
              </div>
            </div>
          </div>
        ))}
      </div>

      {pagination.pages > 1 && (
        <div className="pagination">
          <button
            onClick={() => handlePageChange(pagination.page - 1)}
            disabled={!pagination.has_prev}
            className="pagination-button"
          >
            ← Previous
          </button>

          <div className="page-info">
            Page {pagination.page} of {pagination.pages}
          </div>

          <button
            onClick={() => handlePageChange(pagination.page + 1)}
            disabled={!pagination.has_next}
            className="pagination-button"
          >
            Next →
          </button>
        </div>
      )}
    </div>
  );
};

export default ContentListView;