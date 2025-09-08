import React, { useState } from 'react';
import ContentSubmissionForm from '../components/ContentSystem/ContentSubmissionForm';
import { contentService, ContentSubmissionData } from '../services/contentService';
import './ContentSubmissionPage.css';

const ContentSubmissionPage: React.FC = () => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submissionResult, setSubmissionResult] = useState<any>(null);

  const handleSubmit = async (data: ContentSubmissionData) => {
    setIsSubmitting(true);
    setError(null);

    try {
      const result = await contentService.submitContent(data);
      setSubmissionResult(result);
      setSubmitted(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred during submission');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancel = () => {
    // In a real app, this would navigate back or close the modal
    window.history.back();
  };

  const handleReset = () => {
    setSubmitted(false);
    setSubmissionResult(null);
    setError(null);
  };

  if (submitted && submissionResult) {
    return (
      <div className="content-submission-page">
        <div className="submission-success">
          <div className="success-icon">✅</div>
          <h2>Content Submitted Successfully!</h2>
          <p>Your content has been submitted to the ChordMe community for review.</p>
          
          <div className="submission-details">
            <h3>Submission Details</h3>
            <div className="detail-grid">
              <div className="detail-item">
                <label>Title:</label>
                <span>{submissionResult.submission.title}</span>
              </div>
              <div className="detail-item">
                <label>Type:</label>
                <span>{submissionResult.submission.content_type}</span>
              </div>
              <div className="detail-item">
                <label>Status:</label>
                <span className={`status status-${submissionResult.submission.status}`}>
                  {submissionResult.submission.status.replace('_', ' ').toUpperCase()}
                </span>
              </div>
              <div className="detail-item">
                <label>Quality Score:</label>
                <span className="quality-score">
                  {submissionResult.submission.auto_quality_score.toFixed(1)}/100
                </span>
              </div>
              <div className="detail-item">
                <label>Submission Stage:</label>
                <span>{submissionResult.submission.submission_stage.replace('_', ' ')}</span>
              </div>
            </div>
          </div>

          {submissionResult.submission.quality_issues?.length > 0 && (
            <div className="quality-issues">
              <h4>Quality Improvement Suggestions</h4>
              <ul>
                {submissionResult.submission.quality_issues.map((issue: string, index: number) => (
                  <li key={index}>{issue}</li>
                ))}
              </ul>
            </div>
          )}

          <div className="success-actions">
            <button onClick={handleReset} className="btn btn-primary">
              Submit Another
            </button>
            <button onClick={() => window.location.href = '/content'} className="btn btn-secondary">
              Browse Content
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="content-submission-page">
      <div className="page-header">
        <h1>Submit Content to Community</h1>
        <p>Share your musical creations with the ChordMe community. All submissions go through a quality review process to ensure the best experience for everyone.</p>
      </div>

      {error && (
        <div className="error-banner">
          <div className="error-icon">⚠️</div>
          <div className="error-content">
            <h3>Submission Error</h3>
            <p>{error}</p>
            <button onClick={() => setError(null)} className="error-dismiss">×</button>
          </div>
        </div>
      )}

      <ContentSubmissionForm
        onSubmit={handleSubmit}
        onCancel={handleCancel}
        isSubmitting={isSubmitting}
      />
    </div>
  );
};

export default ContentSubmissionPage;