/**
 * Content System API Service
 * Handles API calls for user-generated content submission, review, and curation
 */

const API_BASE_URL = '/api/v1/content';

interface ContentData {
  chordpro_content?: string;
  artist?: string;
  genre?: string;
  key?: string;
  tempo?: number;
  time_signature?: string;
  difficulty?: string;
  tutorial_content?: string;
  exercise_content?: string;
  [key: string]: unknown;
}

interface LicenseData {
  type: string;
  copyright_holder?: string;
  is_original_work: boolean;
  attribution_text?: string;
  source_url?: string;
  source_notes?: string;
}

export interface ContentSubmissionData {
  title: string;
  description: string;
  content_type: string;
  original_song_id?: number;
  content_data: ContentData;
  license: LicenseData;
}

export interface ContentSubmission {
  id: number;
  title: string;
  description: string;
  content_type: string;
  submitter_id: number;
  original_song_id?: number;
  content_data: ContentData;
  status: string;
  submission_stage: string;
  auto_quality_score: number;
  manual_quality_check: boolean;
  quality_issues: string[];
  review_count: number;
  average_rating: number;
  community_score: number;
  is_featured: boolean;
  featured_at?: string;
  featured_by?: number;
  editorial_notes?: string;
  view_count: number;
  download_count: number;
  share_count: number;
  submitted_at: string;
  reviewed_at?: string;
  published_at?: string;
  created_at: string;
  updated_at: string;
  license?: ContentLicense;
  recent_reviews?: ContentReview[];
}

export interface ContentLicense {
  id: number;
  submission_id: number;
  license_type: string;
  license_details?: string;
  copyright_holder?: string;
  attribution_required: boolean;
  attribution_text?: string;
  is_original_work: boolean;
  original_work_declaration?: string;
  commercial_use_allowed: boolean;
  derivative_works_allowed: boolean;
  share_alike_required: boolean;
  source_url?: string;
  source_notes?: string;
  license_verified: boolean;
  verified_by?: number;
  verification_notes?: string;
  created_at: string;
  updated_at: string;
}

export interface ContentReview {
  id: number;
  submission_id: number;
  reviewer_id: number;
  rating: number;
  review_text?: string;
  quality_rating?: number;
  accuracy_rating?: number;
  usefulness_rating?: number;
  is_verified_reviewer: boolean;
  helpful_votes: number;
  status: string;
  created_at: string;
  updated_at: string;
}

export interface ContentVote {
  id: number;
  submission_id: number;
  voter_id: number;
  vote_type: 'upvote' | 'downvote';
  created_at: string;
}

export interface ContentAnalytics {
  daily_data: Array<{
    id: number;
    submission_id: number;
    date: string;
    views: number;
    downloads: number;
    shares: number;
    favorites: number;
    time_spent_avg: number;
    bounce_rate: number;
    traffic_sources: Record<string, number>;
    referrers: Record<string, number>;
    countries: Record<string, number>;
  }>;
  totals: {
    views: number;
    downloads: number;
    shares: number;
    reviews: number;
    average_rating: number;
    community_score: number;
  };
  top_sources: Record<string, number>;
  top_countries: Record<string, number>;
}

interface ApiResponse<T> {
  status: 'success' | 'error';
  data?: T;
  error?: string;
  message?: string;
}

interface PaginatedResponse<T> {
  submissions: T[];
  pagination: {
    page: number;
    per_page: number;
    total: number;
    pages: number;
    has_next: boolean;
    has_prev: boolean;
  };
}

class ContentService {
  private getAuthHeaders(): HeadersInit {
    const token = localStorage.getItem('token');
    return {
      'Content-Type': 'application/json',
      ...(token && { 'Authorization': `Bearer ${token}` })
    };
  }

  private async makeRequest<T>(url: string, options: RequestInit = {}): Promise<T> {
    const response = await fetch(url, {
      ...options,
      headers: {
        ...this.getAuthHeaders(),
        ...options.headers
      }
    });

    const data: ApiResponse<T> = await response.json();

    if (!response.ok || data.status === 'error') {
      throw new Error(data.error || `HTTP ${response.status}: ${response.statusText}`);
    }

    if (data.data === null || data.data === undefined) {
      throw new Error('API response missing expected data field.');
    }
    return data.data;
  }

  /**
   * Submit new content to the community
   */
  async submitContent(submissionData: ContentSubmissionData): Promise<{ submission: ContentSubmission; message: string }> {
    return this.makeRequest(`${API_BASE_URL}/submit`, {
      method: 'POST',
      body: JSON.stringify(submissionData)
    });
  }

  /**
   * Get list of content submissions with filtering and pagination
   */
  async getContentSubmissions(params: {
    page?: number;
    per_page?: number;
    content_type?: string;
    status?: string;
    featured_only?: boolean;
    submitter_id?: number;
    sort_by?: 'recent' | 'popular' | 'rating' | 'featured';
  } = {}): Promise<PaginatedResponse<ContentSubmission>> {
    const query = new URLSearchParams();
    
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined) {
        query.append(key, String(value));
      }
    });

    return this.makeRequest(`${API_BASE_URL}/submissions?${query}`);
  }

  /**
   * Get a specific content submission with full details
   */
  async getContentSubmission(submissionId: number): Promise<{ submission: ContentSubmission }> {
    return this.makeRequest(`${API_BASE_URL}/submissions/${submissionId}`);
  }

  /**
   * Submit a review for a content submission
   */
  async submitReview(submissionId: number, reviewData: {
    rating: number;
    review_text?: string;
    quality_rating?: number;
    accuracy_rating?: number;
    usefulness_rating?: number;
  }): Promise<{ review: ContentReview; message: string }> {
    return this.makeRequest(`${API_BASE_URL}/submissions/${submissionId}/review`, {
      method: 'POST',
      body: JSON.stringify(reviewData)
    });
  }

  /**
   * Vote on a content submission
   */
  async voteOnContent(submissionId: number, voteType: 'upvote' | 'downvote'): Promise<{
    action: 'added' | 'changed' | 'removed';
    vote_type: 'upvote' | 'downvote' | null;
    community_score: number;
    message: string;
  }> {
    return this.makeRequest(`${API_BASE_URL}/submissions/${submissionId}/vote`, {
      method: 'POST',
      body: JSON.stringify({ vote_type: voteType })
    });
  }

  /**
   * Feature or unfeature content (admin/moderator only)
   */
  async featureContent(submissionId: number, featured: boolean, editorialNotes?: string): Promise<{
    submission: ContentSubmission;
    message: string;
  }> {
    return this.makeRequest(`${API_BASE_URL}/submissions/${submissionId}/feature`, {
      method: 'POST',
      body: JSON.stringify({
        featured,
        editorial_notes: editorialNotes
      })
    });
  }

  /**
   * Get analytics for a content submission (owner only)
   */
  async getContentAnalytics(submissionId: number, days: number = 30): Promise<{ analytics: ContentAnalytics }> {
    return this.makeRequest(`${API_BASE_URL}/submissions/${submissionId}/analytics?days=${days}`);
  }

  /**
   * Search content submissions
   */
  async searchContent(params: {
    q?: string;
    content_type?: string;
    min_rating?: number;
    page?: number;
    per_page?: number;
  } = {}): Promise<PaginatedResponse<ContentSubmission> & { query: string }> {
    const query = new URLSearchParams();
    
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined) {
        query.append(key, String(value));
      }
    });

    return this.makeRequest(`${API_BASE_URL}/search?${query}`);
  }

  /**
   * Get user's own content submissions
   */
  async getMySubmissions(params: {
    page?: number;
    per_page?: number;
    status?: string;
    sort_by?: string;
  } = {}): Promise<PaginatedResponse<ContentSubmission>> {
    // This uses the general getContentSubmissions but filtered by current user
    // The backend should handle user filtering based on auth token
    return this.getContentSubmissions({
      ...params,
      submitter_id: -1 // Special value to indicate "current user"
    });
  }

  /**
   * Update content submission (for owners)
   */
  async updateContentSubmission(submissionId: number, updates: Partial<ContentSubmissionData>): Promise<{
    submission: ContentSubmission;
    message: string;
  }> {
    return this.makeRequest(`${API_BASE_URL}/submissions/${submissionId}`, {
      method: 'PUT',
      body: JSON.stringify(updates)
    });
  }

  /**
   * Delete content submission (for owners)
   */
  async deleteContentSubmission(submissionId: number): Promise<{ message: string }> {
    return this.makeRequest(`${API_BASE_URL}/submissions/${submissionId}`, {
      method: 'DELETE'
    });
  }

  /**
   * Get reviews for a content submission
   */
  async getSubmissionReviews(submissionId: number, params: {
    page?: number;
    per_page?: number;
    sort_by?: 'recent' | 'helpful' | 'rating';
  } = {}): Promise<PaginatedResponse<ContentReview>> {
    const query = new URLSearchParams();
    
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined) {
        query.append(key, String(value));
      }
    });

    return this.makeRequest(`${API_BASE_URL}/submissions/${submissionId}/reviews?${query}`);
  }

  /**
   * Mark a review as helpful
   */
  async markReviewHelpful(reviewId: number, helpful: boolean): Promise<{ message: string }> {
    return this.makeRequest(`${API_BASE_URL}/reviews/${reviewId}/helpful`, {
      method: 'POST',
      body: JSON.stringify({ helpful })
    });
  }

  /**
   * Get featured content
   */
  async getFeaturedContent(params: {
    page?: number;
    per_page?: number;
    content_type?: string;
  } = {}): Promise<PaginatedResponse<ContentSubmission>> {
    return this.getContentSubmissions({
      ...params,
      featured_only: true,
      sort_by: 'featured'
    });
  }

  /**
   * Get trending content
   */
  async getTrendingContent(params: {
    page?: number;
    per_page?: number;
    content_type?: string;
    time_period?: 'day' | 'week' | 'month';
  } = {}): Promise<PaginatedResponse<ContentSubmission>> {
    return this.getContentSubmissions({
      ...params,
      sort_by: 'popular'
    });
  }

  /**
   * Get content statistics for dashboard
   */
  async getContentStats(): Promise<{
    total_submissions: number;
    pending_reviews: number;
    featured_count: number;
    user_submissions: number;
    user_reviews: number;
    popular_content_types: Array<{ type: string; count: number }>;
    recent_activity: Array<{
      type: 'submission' | 'review' | 'feature';
      title: string;
      date: string;
    }>;
  }> {
    return this.makeRequest(`${API_BASE_URL}/stats`);
  }

  /**
   * Export content data (for backup/migration)
   */
  async exportUserContent(): Promise<Blob> {
    const response = await fetch(`${API_BASE_URL}/export`, {
      headers: this.getAuthHeaders()
    });

    if (!response.ok) {
      throw new Error(`Export failed: ${response.statusText}`);
    }

    return response.blob();
  }

  /**
   * Import content data (bulk import)
   */
  async importContent(file: File, options: {
    overwrite_existing?: boolean;
    skip_validation?: boolean;
  } = {}): Promise<{
    imported_count: number;
    skipped_count: number;
    error_count: number;
    errors: string[];
    message: string;
  }> {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('options', JSON.stringify(options));

    const token = localStorage.getItem('token');
    const response = await fetch(`${API_BASE_URL}/import`, {
      method: 'POST',
      headers: {
        ...(token && { 'Authorization': `Bearer ${token}` })
      },
      body: formData
    });

    const data = await response.json();

    if (!response.ok || data.status === 'error') {
      throw new Error(data.error || `Import failed: ${response.statusText}`);
    }

    return data.data;
  }
}

// Create and export singleton instance
export const contentService = new ContentService();

// Export types for use in components
export type {
  ContentSubmissionData,
  ContentSubmission,
  ContentLicense,
  ContentReview,
  ContentVote,
  ContentAnalytics
};