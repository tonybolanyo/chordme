"""
Content submission and review routes for user-generated content system.
Handles content submissions, reviews, ratings, and curation.
"""

from . import app, db
from .models import (User, ContentSubmission, ContentReview, ContentVote, 
                    ContentLicense, ContentAnalytics, Tag, Category, UserReputation)
from .utils import (auth_required, create_error_response, create_success_response, 
                   validate_request_size, sanitize_input, sanitize_html_content)
from .rate_limiter import rate_limit
from .security_headers import security_headers
from flask import request, jsonify, g
from sqlalchemy.exc import IntegrityError
from sqlalchemy import or_, and_, func, desc
from datetime import datetime, timedelta
import json


# Content Submission Endpoints

@app.route('/api/v1/content/submit', methods=['POST'])
@rate_limit("5 per hour")
@security_headers
@validate_request_size(max_content_length=1024*100)  # 100KB limit
@auth_required
def submit_content():
    """Submit new user-generated content."""
    try:
        data = request.get_json()
        
        # Validate required fields
        title = sanitize_input(data.get('title', '').strip())
        content_type = data.get('content_type', '').strip().lower()
        description = sanitize_input(data.get('description', '').strip())
        
        if not title or len(title) < 5:
            return create_error_response("Title must be at least 5 characters long", 400)
        
        if content_type not in ['song', 'arrangement', 'tutorial', 'exercise', 'tab']:
            return create_error_response("Invalid content type", 400)
        
        # Validate content data
        content_data = data.get('content_data', {})
        if content_type in ['song', 'arrangement'] and not content_data.get('chordpro_content'):
            return create_error_response("ChordPro content is required for songs and arrangements", 400)
        
        # Create submission
        submission = ContentSubmission(
            title=title,
            submitter_id=g.current_user.id,
            content_type=content_type,
            description=description,
            original_song_id=data.get('original_song_id'),
            content_data=content_data
        )
        
        # Calculate initial quality score
        submission.calculate_quality_score()
        
        # Set initial status based on quality score
        if submission.auto_quality_score >= 70:
            submission.status = 'under_review'
            submission.submission_stage = 'community_review'
        elif submission.auto_quality_score >= 50:
            submission.status = 'under_review'
            submission.submission_stage = 'quality_check'
        else:
            submission.status = 'pending'
            submission.quality_issues = [
                "Content needs improvement to meet quality standards",
                "Please review and enhance your submission"
            ]
        
        db.session.add(submission)
        db.session.flush()  # Get submission ID
        
        # Handle licensing information
        license_data = data.get('license', {})
        if license_data:
            license_obj = ContentLicense(
                submission_id=submission.id,
                license_type=license_data.get('type', 'original'),
                copyright_holder=license_data.get('copyright_holder'),
                is_original_work=license_data.get('is_original_work', False)
            )
            
            if license_data.get('attribution_text'):
                license_obj.attribution_text = sanitize_input(license_data['attribution_text'])
            if license_data.get('source_url'):
                license_obj.source_url = license_data['source_url']
            if license_data.get('source_notes'):
                license_obj.source_notes = sanitize_input(license_data['source_notes'])
            
            db.session.add(license_obj)
        
        # Initialize analytics
        analytics = ContentAnalytics(submission_id=submission.id)
        db.session.add(analytics)
        
        # Update user reputation
        user_reputation = UserReputation.query.filter_by(user_id=g.current_user.id).first()
        if not user_reputation:
            user_reputation = UserReputation(user_id=g.current_user.id)
            db.session.add(user_reputation)
        
        user_reputation.posts_created += 1
        user_reputation.total_score += 5  # Points for content submission
        user_reputation.calculate_level()
        
        db.session.commit()
        
        return create_success_response({
            'submission': submission.to_dict(),
            'message': 'Content submitted successfully'
        }, 201)
        
    except Exception as e:
        db.session.rollback()
        app.logger.error(f"Content submission error: {str(e)}")
        return create_error_response("Failed to submit content", 500)


@app.route('/api/v1/content/submissions', methods=['GET'])
@security_headers
def get_content_submissions():
    """Get list of content submissions with filtering and pagination."""
    try:
        # Query parameters
        page = request.args.get('page', 1, type=int)
        per_page = min(request.args.get('per_page', 20, type=int), 100)
        content_type = request.args.get('content_type')
        status = request.args.get('status')
        featured_only = request.args.get('featured_only', False, type=bool)
        submitter_id = request.args.get('submitter_id', type=int)
        sort_by = request.args.get('sort_by', 'recent')  # recent, popular, rating, featured
        
        # Build query
        query = ContentSubmission.query
        
        # Apply filters
        if content_type:
            query = query.filter(ContentSubmission.content_type == content_type)
        
        if status:
            query = query.filter(ContentSubmission.status == status)
        else:
            # Default to approved/featured content for public access
            query = query.filter(ContentSubmission.status.in_(['approved', 'featured']))
        
        if featured_only:
            query = query.filter(ContentSubmission.is_featured == True)
        
        if submitter_id:
            query = query.filter(ContentSubmission.submitter_id == submitter_id)
        
        # Apply sorting
        if sort_by == 'popular':
            query = query.order_by(desc(ContentSubmission.view_count))
        elif sort_by == 'rating':
            query = query.order_by(desc(ContentSubmission.average_rating))
        elif sort_by == 'featured':
            query = query.order_by(desc(ContentSubmission.is_featured), desc(ContentSubmission.featured_at))
        else:  # recent
            query = query.order_by(desc(ContentSubmission.created_at))
        
        # Paginate results
        pagination = query.paginate(
            page=page, per_page=per_page, error_out=False
        )
        
        submissions = [submission.to_dict(include_content=False) for submission in pagination.items]
        
        return create_success_response({
            'submissions': submissions,
            'pagination': {
                'page': page,
                'per_page': per_page,
                'total': pagination.total,
                'pages': pagination.pages,
                'has_next': pagination.has_next,
                'has_prev': pagination.has_prev
            }
        })
        
    except Exception as e:
        app.logger.error(f"Get submissions error: {str(e)}")
        return create_error_response("Failed to retrieve submissions", 500)


@app.route('/api/v1/content/submissions/<int:submission_id>', methods=['GET'])
@security_headers
def get_content_submission(submission_id):
    """Get a specific content submission with full details."""
    try:
        submission = ContentSubmission.query.get_or_404(submission_id)
        
        # Check access permissions
        if submission.status not in ['approved', 'featured']:
            # Only submitter or admin can view non-approved content
            if not hasattr(g, 'current_user') or not g.current_user:
                return create_error_response("Content not found", 404)
            
            if g.current_user.id != submission.submitter_id:
                # TODO: Add admin role check
                return create_error_response("Access denied", 403)
        
        # Update view count
        submission.view_count += 1
        
        # Update analytics
        analytics = ContentAnalytics.query.filter_by(
            submission_id=submission_id,
            date=datetime.utcnow().date()
        ).first()
        
        if not analytics:
            analytics = ContentAnalytics(submission_id=submission_id)
            db.session.add(analytics)
        
        # Get referrer and source information
        referrer = request.headers.get('Referer')
        user_agent = request.headers.get('User-Agent', '')
        source = 'api' if 'api' in user_agent.lower() else 'web'
        
        analytics.add_view(source=source, referrer=referrer)
        
        db.session.commit()
        
        # Get submission data with reviews and license
        result = submission.to_dict()
        
        # Add license information
        if hasattr(submission, 'license') and submission.license:
            result['license'] = submission.license.to_dict()
        
        # Add recent reviews (top 5)
        recent_reviews = ContentReview.query.filter_by(
            submission_id=submission_id,
            status='active'
        ).order_by(desc(ContentReview.created_at)).limit(5).all()
        
        result['recent_reviews'] = [review.to_dict() for review in recent_reviews]
        
        return create_success_response({'submission': result})
        
    except Exception as e:
        app.logger.error(f"Get submission error: {str(e)}")
        return create_error_response("Failed to retrieve submission", 500)


# Content Review Endpoints

@app.route('/api/v1/content/submissions/<int:submission_id>/review', methods=['POST'])
@rate_limit("3 per hour")
@security_headers
@validate_request_size(max_content_length=1024*10)  # 10KB limit
@auth_required
def submit_content_review(submission_id):
    """Submit a review for a content submission."""
    try:
        submission = ContentSubmission.query.get_or_404(submission_id)
        
        # Validate submission status
        if submission.status not in ['under_review', 'approved', 'featured']:
            return create_error_response("Content is not available for review", 400)
        
        # Check if user already reviewed this submission
        existing_review = ContentReview.query.filter_by(
            submission_id=submission_id,
            reviewer_id=g.current_user.id
        ).first()
        
        if existing_review:
            return create_error_response("You have already reviewed this content", 400)
        
        # Prevent self-review
        if submission.submitter_id == g.current_user.id:
            return create_error_response("You cannot review your own content", 400)
        
        data = request.get_json()
        
        # Validate rating
        rating = data.get('rating', type=int)
        if not rating or rating < 1 or rating > 5:
            return create_error_response("Rating must be between 1 and 5", 400)
        
        # Create review
        review = ContentReview(
            submission_id=submission_id,
            reviewer_id=g.current_user.id,
            rating=rating,
            review_text=sanitize_html_content(data.get('review_text', '')),
            quality_rating=data.get('quality_rating', type=int),
            accuracy_rating=data.get('accuracy_rating', type=int),
            usefulness_rating=data.get('usefulness_rating', type=int)
        )
        
        # Check if reviewer is verified (high reputation)
        user_reputation = UserReputation.query.filter_by(user_id=g.current_user.id).first()
        if user_reputation and user_reputation.total_score >= 500:
            review.is_verified_reviewer = True
        
        db.session.add(review)
        
        # Update submission aggregates
        submission.update_aggregates()
        
        # Update reviewer reputation
        if not user_reputation:
            user_reputation = UserReputation(user_id=g.current_user.id)
            db.session.add(user_reputation)
        
        user_reputation.posts_created += 1
        user_reputation.total_score += 3  # Points for reviewing
        user_reputation.calculate_level()
        
        db.session.commit()
        
        return create_success_response({
            'review': review.to_dict(),
            'message': 'Review submitted successfully'
        }, 201)
        
    except Exception as e:
        db.session.rollback()
        app.logger.error(f"Content review error: {str(e)}")
        return create_error_response("Failed to submit review", 500)


@app.route('/api/v1/content/submissions/<int:submission_id>/vote', methods=['POST'])
@rate_limit("20 per minute")
@security_headers
@auth_required
def vote_on_content(submission_id):
    """Vote on a content submission (upvote/downvote)."""
    try:
        submission = ContentSubmission.query.get_or_404(submission_id)
        
        # Validate submission status
        if submission.status not in ['under_review', 'approved', 'featured']:
            return create_error_response("Content is not available for voting", 400)
        
        # Prevent self-voting
        if submission.submitter_id == g.current_user.id:
            return create_error_response("You cannot vote on your own content", 400)
        
        data = request.get_json()
        vote_type = data.get('vote_type', '').strip().lower()
        
        if vote_type not in ['upvote', 'downvote']:
            return create_error_response("Invalid vote type", 400)
        
        # Check for existing vote
        existing_vote = ContentVote.query.filter_by(
            submission_id=submission_id,
            voter_id=g.current_user.id
        ).first()
        
        if existing_vote:
            # Update existing vote
            if existing_vote.vote_type == vote_type:
                # Remove vote if clicking same type
                db.session.delete(existing_vote)
                action = 'removed'
            else:
                # Change vote type
                existing_vote.vote_type = vote_type
                action = 'changed'
        else:
            # Create new vote
            vote = ContentVote(
                submission_id=submission_id,
                voter_id=g.current_user.id,
                vote_type=vote_type
            )
            db.session.add(vote)
            action = 'added'
        
        # Update submission aggregates
        submission.update_aggregates()
        
        # Update submitter reputation
        submitter_reputation = UserReputation.query.filter_by(user_id=submission.submitter_id).first()
        if submitter_reputation:
            if vote_type == 'upvote' and action in ['added', 'changed']:
                submitter_reputation.post_score += 10
                submitter_reputation.total_score += 10
            elif vote_type == 'downvote' and action in ['added', 'changed']:
                submitter_reputation.post_score -= 2
                submitter_reputation.total_score -= 2
            
            submitter_reputation.calculate_level()
        
        db.session.commit()
        
        return create_success_response({
            'action': action,
            'vote_type': vote_type if action != 'removed' else None,
            'community_score': submission.community_score,
            'message': f'Vote {action} successfully'
        })
        
    except Exception as e:
        db.session.rollback()
        app.logger.error(f"Content voting error: {str(e)}")
        return create_error_response("Failed to process vote", 500)


# Content Curation and Moderation Endpoints

@app.route('/api/v1/content/submissions/<int:submission_id>/feature', methods=['POST'])
@rate_limit("10 per hour")
@security_headers
@auth_required
def feature_content(submission_id):
    """Feature a content submission (admin/moderator only)."""
    try:
        submission = ContentSubmission.query.get_or_404(submission_id)
        
        # TODO: Add proper admin/moderator role check
        # For now, require high reputation
        user_reputation = UserReputation.query.filter_by(user_id=g.current_user.id).first()
        if not user_reputation or user_reputation.total_score < 1000:
            return create_error_response("Insufficient permissions", 403)
        
        data = request.get_json()
        featured = data.get('featured', True, type=bool)
        editorial_notes = sanitize_input(data.get('editorial_notes', ''))
        
        submission.is_featured = featured
        if featured:
            submission.featured_at = datetime.utcnow()
            submission.featured_by = g.current_user.id
            submission.status = 'featured'
        else:
            submission.featured_at = None
            submission.featured_by = None
            if submission.status == 'featured':
                submission.status = 'approved'
        
        if editorial_notes:
            submission.editorial_notes = editorial_notes
        
        db.session.commit()
        
        action = 'featured' if featured else 'unfeatured'
        return create_success_response({
            'submission': submission.to_dict(include_content=False),
            'message': f'Content {action} successfully'
        })
        
    except Exception as e:
        db.session.rollback()
        app.logger.error(f"Content featuring error: {str(e)}")
        return create_error_response("Failed to update content status", 500)


# Content Analytics Endpoints

@app.route('/api/v1/content/submissions/<int:submission_id>/analytics', methods=['GET'])
@security_headers
@auth_required
def get_content_analytics(submission_id):
    """Get analytics for a content submission (owner only)."""
    try:
        submission = ContentSubmission.query.get_or_404(submission_id)
        
        # Check ownership
        if submission.submitter_id != g.current_user.id:
            # TODO: Add admin role check
            return create_error_response("Access denied", 403)
        
        # Get analytics data
        days = request.args.get('days', 30, type=int)
        end_date = datetime.utcnow().date()
        start_date = end_date - timedelta(days=days)
        
        analytics = ContentAnalytics.query.filter(
            ContentAnalytics.submission_id == submission_id,
            ContentAnalytics.date >= start_date,
            ContentAnalytics.date <= end_date
        ).order_by(ContentAnalytics.date).all()
        
        # Calculate totals
        total_views = sum(a.views for a in analytics)
        total_downloads = sum(a.downloads for a in analytics)
        total_shares = sum(a.shares for a in analytics)
        
        # Get top traffic sources and countries
        all_sources = {}
        all_countries = {}
        
        for a in analytics:
            for source, count in (a.traffic_sources or {}).items():
                all_sources[source] = all_sources.get(source, 0) + count
            for country, count in (a.countries or {}).items():
                all_countries[country] = all_countries.get(country, 0) + count
        
        return create_success_response({
            'analytics': {
                'daily_data': [a.to_dict() for a in analytics],
                'totals': {
                    'views': total_views,
                    'downloads': total_downloads,
                    'shares': total_shares,
                    'reviews': submission.review_count,
                    'average_rating': submission.average_rating,
                    'community_score': submission.community_score
                },
                'top_sources': dict(sorted(all_sources.items(), key=lambda x: x[1], reverse=True)[:10]),
                'top_countries': dict(sorted(all_countries.items(), key=lambda x: x[1], reverse=True)[:10])
            }
        })
        
    except Exception as e:
        app.logger.error(f"Content analytics error: {str(e)}")
        return create_error_response("Failed to retrieve analytics", 500)


# Content Search and Discovery

@app.route('/api/v1/content/search', methods=['GET'])
@security_headers
def search_content():
    """Search content submissions."""
    try:
        query_text = request.args.get('q', '').strip()
        content_type = request.args.get('content_type')
        min_rating = request.args.get('min_rating', type=float)
        page = request.args.get('page', 1, type=int)
        per_page = min(request.args.get('per_page', 20, type=int), 100)
        
        # Build search query
        query = ContentSubmission.query.filter(
            ContentSubmission.status.in_(['approved', 'featured'])
        )
        
        if query_text:
            # Search in title and description
            search_filter = or_(
                ContentSubmission.title.contains(query_text),
                ContentSubmission.description.contains(query_text)
            )
            query = query.filter(search_filter)
        
        if content_type:
            query = query.filter(ContentSubmission.content_type == content_type)
        
        if min_rating:
            query = query.filter(ContentSubmission.average_rating >= min_rating)
        
        # Order by relevance (featured first, then by rating and views)
        query = query.order_by(
            desc(ContentSubmission.is_featured),
            desc(ContentSubmission.average_rating),
            desc(ContentSubmission.view_count)
        )
        
        # Paginate results
        pagination = query.paginate(
            page=page, per_page=per_page, error_out=False
        )
        
        submissions = [submission.to_dict(include_content=False) for submission in pagination.items]
        
        return create_success_response({
            'submissions': submissions,
            'pagination': {
                'page': page,
                'per_page': per_page,
                'total': pagination.total,
                'pages': pagination.pages,
                'has_next': pagination.has_next,
                'has_prev': pagination.has_prev
            },
            'query': query_text
        })
        
    except Exception as e:
        app.logger.error(f"Content search error: {str(e)}")
        return create_error_response("Failed to search content", 500)