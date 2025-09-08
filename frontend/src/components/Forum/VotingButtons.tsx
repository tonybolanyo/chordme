import React, { useState } from 'react';
import './VotingButtons.css';

interface VotingButtonsProps {
  targetType: 'thread' | 'post';
  targetId: number;
  initialScore: number;
  initialUserVote?: 'upvote' | 'downvote' | 'helpful' | null;
  showHelpful?: boolean;
  helpfulCount?: number;
  className?: string;
  onVoteChange?: (newScore: number, userVote: string | null) => void;
}

const VotingButtons: React.FC<VotingButtonsProps> = ({
  targetType,
  targetId,
  initialScore,
  initialUserVote = null,
  showHelpful = false,
  helpfulCount = 0,
  className = '',
  onVoteChange
}) => {
  const [score, setScore] = useState(initialScore);
  const [userVote, setUserVote] = useState<string | null>(initialUserVote);
  const [helpful, setHelpful] = useState(helpfulCount);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleVote = async (voteType: 'upvote' | 'downvote' | 'helpful') => {
    try {
      setLoading(true);
      setError(null);

      const endpoint = targetType === 'thread' 
        ? `/api/v1/forum/threads/${targetId}/vote`
        : `/api/v1/forum/posts/${targetId}/vote`;

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('jwt_token')}` // Would use proper auth context
        },
        body: JSON.stringify({ vote_type: voteType })
      });

      if (!response.ok) {
        if (response.status === 401) {
          throw new Error('Please log in to vote');
        }
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      if (data.status === 'success') {
        if (voteType === 'helpful') {
          setHelpful(data.data.helpful_count || 0);
        } else {
          setScore(data.data.vote_score);
        }
        setUserVote(data.data.user_vote);
        
        if (onVoteChange && voteType !== 'helpful') {
          onVoteChange(data.data.vote_score, data.data.user_vote);
        }
      } else {
        throw new Error(data.error || 'Failed to vote');
      }
    } catch (err) {
      console.error('Error voting:', err);
      setError(err instanceof Error ? err.message : 'Unknown error occurred');
    } finally {
      setLoading(false);
    }
  };

  const getVoteButtonClass = (voteType: string): string => {
    let baseClass = `vote-button vote-button--${voteType}`;
    if (userVote === voteType) {
      baseClass += ' vote-button--active';
    }
    if (loading) {
      baseClass += ' vote-button--loading';
    }
    return baseClass;
  };

  return (
    <div className={`voting-buttons ${className}`}>
      {error && (
        <div className="voting-error" role="alert">
          {error}
          <button 
            className="error-dismiss"
            onClick={() => setError(null)}
            aria-label="Dismiss error"
            type="button"
          >
            ×
          </button>
        </div>
      )}
      
      <div className="vote-controls">
        <button
          className={getVoteButtonClass('upvote')}
          onClick={() => handleVote('upvote')}
          disabled={loading}
          aria-label={`Upvote (${userVote === 'upvote' ? 'remove vote' : 'add vote'})`}
          title="Upvote this content"
          type="button"
        >
          <span className="vote-icon">👍</span>
        </button>
        
        <div className="vote-score" aria-label={`Current score: ${score}`}>
          {score}
        </div>
        
        <button
          className={getVoteButtonClass('downvote')}
          onClick={() => handleVote('downvote')}
          disabled={loading}
          aria-label={`Downvote (${userVote === 'downvote' ? 'remove vote' : 'add vote'})`}
          title="Downvote this content"
          type="button"
        >
          <span className="vote-icon">👎</span>
        </button>
      </div>
      
      {showHelpful && (
        <div className="helpful-controls">
          <button
            className={getVoteButtonClass('helpful')}
            onClick={() => handleVote('helpful')}
            disabled={loading}
            aria-label={`Mark as helpful (${userVote === 'helpful' ? 'remove vote' : 'add vote'})`}
            title="Mark this as helpful"
            type="button"
          >
            <span className="vote-icon">🌟</span>
            <span className="helpful-text">Helpful</span>
            {helpful > 0 && <span className="helpful-count">({helpful})</span>}
          </button>
        </div>
      )}
      
      {loading && (
        <div className="voting-spinner" aria-label="Processing vote">
          <div className="spinner"></div>
        </div>
      )}
    </div>
  );
};

export default VotingButtons;