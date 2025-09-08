"""
Test suite for the User-Generated Content System.
Tests content submission, review, voting, and curation functionality.
"""

import pytest
import json
from datetime import datetime, timedelta
from chordme import app, db
from chordme.models import (User, ContentSubmission, ContentReview, ContentVote, 
                           ContentLicense, ContentAnalytics, UserReputation)


class TestContentSubmissionWorkflow:
    """Test content submission workflow and quality gates."""
    
    def test_content_submission_success(self, authenticated_client, test_user):
        """Test successful content submission."""
        submission_data = {
            'title': 'Amazing Grace - Fingerstyle Arrangement',
            'description': 'A beautiful fingerstyle arrangement of the classic hymn Amazing Grace',
            'content_type': 'arrangement',
            'content_data': {
                'chordpro_content': '''{title: Amazing Grace}
{artist: Traditional}
{key: G}

[G]Amazing [D]grace how [G]sweet the [C]sound
That [G]saved a [Em]wretch like [D]me
[G]I once was [D]lost but [G]now I'm [C]found
Was [G]blind but [D]now I [G]see''',
                'difficulty': 'intermediate',
                'tempo': 72
            },
            'license': {
                'type': 'CC BY-SA 4.0',
                'is_original_work': True,
                'attribution_text': 'Arrangement by Test User'
            }
        }
        
        response = authenticated_client.post('/api/v1/content/submit', 
                                           json=submission_data)
        
        assert response.status_code == 201
        data = response.get_json()
        assert data['status'] == 'success'
        assert 'submission' in data['data']
        
        submission = data['data']['submission']
        assert submission['title'] == submission_data['title']
        assert submission['content_type'] == 'arrangement'
        assert submission['submitter_id'] == test_user.id
        assert submission['auto_quality_score'] > 0
        
        # Verify license was created
        license_check = ContentLicense.query.filter_by(
            submission_id=submission['id']
        ).first()
        assert license_check is not None
        assert license_check.license_type == 'CC BY-SA 4.0'
    
    def test_content_submission_validation_errors(self, authenticated_client):
        """Test content submission validation."""
        # Missing title
        response = authenticated_client.post('/api/v1/content/submit', 
                                           json={'content_type': 'song'})
        assert response.status_code == 400
        
        # Invalid content type
        response = authenticated_client.post('/api/v1/content/submit', 
                                           json={
                                               'title': 'Test Song',
                                               'content_type': 'invalid_type'
                                           })
        assert response.status_code == 400
        
        # Missing ChordPro content for song
        response = authenticated_client.post('/api/v1/content/submit', 
                                           json={
                                               'title': 'Test Song',
                                               'content_type': 'song',
                                               'content_data': {}
                                           })
        assert response.status_code == 400
    
    def test_quality_score_calculation(self, test_user):
        """Test automated quality score calculation."""
        # High quality submission
        submission = ContentSubmission(
            title='Complete Song with Full Metadata',
            submitter_id=test_user.id,
            content_type='song',
            description='A comprehensive song submission with all metadata fields completed',
            content_data={
                'chordpro_content': '{title: Test Song}\n{artist: Test Artist}\n{key: C}\n{tempo: 120}\n{time: 4/4}\n\n[C]Hello [F]world [G]this is a [C]test\nWith [Am]chords and [F]proper [G]format',
                'artist': 'Test Artist',
                'genre': 'Folk',
                'key': 'C',
                'tempo': 120,
                'time_signature': '4/4'
            }
        )
        
        score = submission.calculate_quality_score()
        assert score >= 90  # Should get high score for completeness
        
        # Low quality submission
        submission_low = ContentSubmission(
            title='Test',  # Too short
            submitter_id=test_user.id,
            content_type='song',
            content_data={
                'chordpro_content': 'short'  # Too short, no chords
            }
        )
        
        score_low = submission_low.calculate_quality_score()
        assert score_low < 50  # Should get low score
    
    def test_content_submission_workflow_stages(self, authenticated_client, test_user):
        """Test different workflow stages based on quality."""
        # High quality submission should go to community review
        high_quality_data = {
            'title': 'High Quality Song Submission',
            'description': 'This is a comprehensive song with excellent metadata and content',
            'content_type': 'song',
            'content_data': {
                'chordpro_content': '{title: High Quality Song}\n{artist: Test Artist}\n{key: C}\n\n[C]This is a [F]complete [G]song [C]example\nWith [Am]proper [F]chord [G]structure',
                'artist': 'Test Artist',
                'genre': 'Folk',
                'key': 'C',
                'tempo': 120
            }
        }
        
        response = authenticated_client.post('/api/v1/content/submit', 
                                           json=high_quality_data)
        data = response.get_json()
        submission = data['data']['submission']
        
        assert submission['status'] == 'under_review'
        assert submission['submission_stage'] == 'community_review'
        
        # Low quality submission should remain pending
        low_quality_data = {
            'title': 'Low',
            'content_type': 'song',
            'content_data': {
                'chordpro_content': 'test'
            }
        }
        
        response = authenticated_client.post('/api/v1/content/submit', 
                                           json=low_quality_data)
        data = response.get_json()
        submission = data['data']['submission']
        
        assert submission['status'] == 'pending'
        assert len(submission['quality_issues']) > 0


class TestContentReviewSystem:
    """Test community review and rating system."""
    
    def test_submit_content_review(self, authenticated_client, test_user, second_user):
        """Test submitting a review for content."""
        # Create a submission to review
        submission = ContentSubmission(
            title='Test Song for Review',
            submitter_id=second_user.id,
            content_type='song',
            status='under_review',
            content_data={'chordpro_content': 'test content'}
        )
        db.session.add(submission)
        db.session.commit()
        
        review_data = {
            'rating': 4,
            'review_text': 'Great arrangement! Really enjoyed the chord progressions.',
            'quality_rating': 4,
            'accuracy_rating': 5,
            'usefulness_rating': 4
        }
        
        response = authenticated_client.post(
            f'/api/v1/content/submissions/{submission.id}/review',
            json=review_data
        )
        
        assert response.status_code == 201
        data = response.get_json()
        assert data['status'] == 'success'
        
        review = data['data']['review']
        assert review['rating'] == 4
        assert review['reviewer_id'] == test_user.id
        assert review['quality_rating'] == 4
        
        # Verify aggregates were updated
        updated_submission = ContentSubmission.query.get(submission.id)
        assert updated_submission.review_count == 1
        assert updated_submission.average_rating == 4.0
    
    def test_prevent_duplicate_reviews(self, authenticated_client, test_user, second_user):
        """Test prevention of duplicate reviews by same user."""
        submission = ContentSubmission(
            title='Test Song',
            submitter_id=second_user.id,
            content_type='song',
            status='under_review'
        )
        db.session.add(submission)
        db.session.commit()
        
        # Submit first review
        review_data = {'rating': 4, 'review_text': 'Good song'}
        response = authenticated_client.post(
            f'/api/v1/content/submissions/{submission.id}/review',
            json=review_data
        )
        assert response.status_code == 201
        
        # Try to submit second review
        response = authenticated_client.post(
            f'/api/v1/content/submissions/{submission.id}/review',
            json=review_data
        )
        assert response.status_code == 400
        data = response.get_json()
        assert 'already reviewed' in data['error'].lower()
    
    def test_prevent_self_review(self, authenticated_client, test_user):
        """Test prevention of self-reviews."""
        submission = ContentSubmission(
            title='My Own Song',
            submitter_id=test_user.id,
            content_type='song',
            status='under_review'
        )
        db.session.add(submission)
        db.session.commit()
        
        review_data = {'rating': 5, 'review_text': 'I love my own work!'}
        response = authenticated_client.post(
            f'/api/v1/content/submissions/{submission.id}/review',
            json=review_data
        )
        
        assert response.status_code == 400
        data = response.get_json()
        assert 'cannot review your own' in data['error'].lower()
    
    def test_verified_reviewer_status(self, authenticated_client, test_user, second_user):
        """Test verified reviewer status for high reputation users."""
        # Set up high reputation user
        reputation = UserReputation(user_id=test_user.id)
        reputation.total_score = 1000  # High reputation
        reputation.calculate_level()
        db.session.add(reputation)
        
        submission = ContentSubmission(
            title='Test Song',
            submitter_id=second_user.id,
            content_type='song',
            status='under_review'
        )
        db.session.add(submission)
        db.session.commit()
        
        review_data = {'rating': 4, 'review_text': 'Expert review'}
        response = authenticated_client.post(
            f'/api/v1/content/submissions/{submission.id}/review',
            json=review_data
        )
        
        assert response.status_code == 201
        data = response.get_json()
        review = data['data']['review']
        assert review['is_verified_reviewer'] == True


class TestContentVotingSystem:
    """Test community voting system for content."""
    
    def test_vote_on_content(self, authenticated_client, test_user, second_user):
        """Test voting on content submissions."""
        submission = ContentSubmission(
            title='Test Song to Vote',
            submitter_id=second_user.id,
            content_type='song',
            status='approved'
        )
        db.session.add(submission)
        db.session.commit()
        
        # Test upvote
        response = authenticated_client.post(
            f'/api/v1/content/submissions/{submission.id}/vote',
            json={'vote_type': 'upvote'}
        )
        
        assert response.status_code == 200
        data = response.get_json()
        assert data['data']['action'] == 'added'
        assert data['data']['vote_type'] == 'upvote'
        assert data['data']['community_score'] == 1
        
        # Test changing vote to downvote
        response = authenticated_client.post(
            f'/api/v1/content/submissions/{submission.id}/vote',
            json={'vote_type': 'downvote'}
        )
        
        assert response.status_code == 200
        data = response.get_json()
        assert data['data']['action'] == 'changed'
        assert data['data']['vote_type'] == 'downvote'
        assert data['data']['community_score'] == -1
        
        # Test removing vote
        response = authenticated_client.post(
            f'/api/v1/content/submissions/{submission.id}/vote',
            json={'vote_type': 'downvote'}
        )
        
        assert response.status_code == 200
        data = response.get_json()
        assert data['data']['action'] == 'removed'
        assert data['data']['vote_type'] is None
        assert data['data']['community_score'] == 0
    
    def test_prevent_self_voting(self, authenticated_client, test_user):
        """Test prevention of self-voting."""
        submission = ContentSubmission(
            title='My Own Song',
            submitter_id=test_user.id,
            content_type='song',
            status='approved'
        )
        db.session.add(submission)
        db.session.commit()
        
        response = authenticated_client.post(
            f'/api/v1/content/submissions/{submission.id}/vote',
            json={'vote_type': 'upvote'}
        )
        
        assert response.status_code == 400
        data = response.get_json()
        assert 'cannot vote on your own' in data['error'].lower()


class TestContentCuration:
    """Test editorial curation and featuring system."""
    
    def test_feature_content(self, authenticated_client, test_user, second_user):
        """Test featuring content (requires high reputation)."""
        # Set up high reputation user (curator)
        reputation = UserReputation(user_id=test_user.id)
        reputation.total_score = 1500  # High reputation for curation
        reputation.calculate_level()
        db.session.add(reputation)
        
        submission = ContentSubmission(
            title='Great Song to Feature',
            submitter_id=second_user.id,
            content_type='song',
            status='approved'
        )
        db.session.add(submission)
        db.session.commit()
        
        feature_data = {
            'featured': True,
            'editorial_notes': 'Excellent arrangement with great educational value'
        }
        
        response = authenticated_client.post(
            f'/api/v1/content/submissions/{submission.id}/feature',
            json=feature_data
        )
        
        assert response.status_code == 200
        data = response.get_json()
        submission_data = data['data']['submission']
        
        assert submission_data['is_featured'] == True
        assert submission_data['status'] == 'featured'
        assert submission_data['featured_by'] == test_user.id
        assert submission_data['editorial_notes'] == feature_data['editorial_notes']
    
    def test_feature_content_insufficient_permissions(self, authenticated_client, test_user, second_user):
        """Test featuring content with insufficient permissions."""
        # Low reputation user
        reputation = UserReputation(user_id=test_user.id)
        reputation.total_score = 100  # Low reputation
        db.session.add(reputation)
        
        submission = ContentSubmission(
            title='Song to Feature',
            submitter_id=second_user.id,
            content_type='song',
            status='approved'
        )
        db.session.add(submission)
        db.session.commit()
        
        response = authenticated_client.post(
            f'/api/v1/content/submissions/{submission.id}/feature',
            json={'featured': True}
        )
        
        assert response.status_code == 403
        data = response.get_json()
        assert 'insufficient permissions' in data['error'].lower()


class TestContentAnalytics:
    """Test analytics and performance tracking."""
    
    def test_content_view_tracking(self, authenticated_client, test_user):
        """Test view tracking when accessing content."""
        submission = ContentSubmission(
            title='Test Song for Analytics',
            submitter_id=test_user.id,
            content_type='song',
            status='approved',
            view_count=0
        )
        db.session.add(submission)
        db.session.commit()
        
        # Access the content
        response = authenticated_client.get(f'/api/v1/content/submissions/{submission.id}')
        
        assert response.status_code == 200
        
        # Check that view count was incremented
        updated_submission = ContentSubmission.query.get(submission.id)
        assert updated_submission.view_count == 1
        
        # Check that analytics record was created
        analytics = ContentAnalytics.query.filter_by(
            submission_id=submission.id,
            date=datetime.utcnow().date()
        ).first()
        
        assert analytics is not None
        assert analytics.views == 1
    
    def test_get_content_analytics(self, authenticated_client, test_user):
        """Test retrieving analytics for content owner."""
        submission = ContentSubmission(
            title='My Song Analytics',
            submitter_id=test_user.id,
            content_type='song',
            status='approved'
        )
        db.session.add(submission)
        db.session.flush()
        
        # Create some analytics data
        analytics = ContentAnalytics(
            submission_id=submission.id,
            date=datetime.utcnow().date()
        )
        analytics.views = 100
        analytics.downloads = 25
        analytics.shares = 10
        analytics.traffic_sources = {'web': 80, 'api': 20}
        analytics.countries = {'US': 60, 'UK': 25, 'CA': 15}
        
        db.session.add(analytics)
        db.session.commit()
        
        response = authenticated_client.get(
            f'/api/v1/content/submissions/{submission.id}/analytics?days=30'
        )
        
        assert response.status_code == 200
        data = response.get_json()
        analytics_data = data['data']['analytics']
        
        assert analytics_data['totals']['views'] == 100
        assert analytics_data['totals']['downloads'] == 25
        assert analytics_data['totals']['shares'] == 10
        assert 'web' in analytics_data['top_sources']
        assert 'US' in analytics_data['top_countries']
    
    def test_analytics_access_control(self, authenticated_client, test_user, second_user):
        """Test that only content owners can access analytics."""
        submission = ContentSubmission(
            title='Someone Elses Song',
            submitter_id=second_user.id,
            content_type='song',
            status='approved'
        )
        db.session.add(submission)
        db.session.commit()
        
        response = authenticated_client.get(
            f'/api/v1/content/submissions/{submission.id}/analytics'
        )
        
        assert response.status_code == 403
        data = response.get_json()
        assert 'access denied' in data['error'].lower()


class TestContentSearch:
    """Test content search and discovery functionality."""
    
    def test_search_content(self, client, test_user):
        """Test searching content submissions."""
        # Create test submissions
        submissions = [
            ContentSubmission(
                title='Amazing Grace Fingerstyle',
                description='Beautiful fingerstyle arrangement',
                submitter_id=test_user.id,
                content_type='arrangement',
                status='approved',
                average_rating=4.5,
                view_count=100
            ),
            ContentSubmission(
                title='Blues Progression Tutorial',
                description='Learn the basic blues progression',
                submitter_id=test_user.id,
                content_type='tutorial',
                status='featured',
                average_rating=4.8,
                view_count=200,
                is_featured=True
            ),
            ContentSubmission(
                title='Classical Guitar Exercise',
                description='Daily practice exercise for classical guitar',
                submitter_id=test_user.id,
                content_type='exercise',
                status='approved',
                average_rating=4.2,
                view_count=80
            )
        ]
        
        for submission in submissions:
            db.session.add(submission)
        db.session.commit()
        
        # Test basic search
        response = client.get('/api/v1/content/search?q=guitar')
        assert response.status_code == 200
        data = response.get_json()
        
        # Should find both "Classical Guitar Exercise" and potentially others
        assert len(data['data']['submissions']) >= 1
        assert data['data']['query'] == 'guitar'
        
        # Test content type filter
        response = client.get('/api/v1/content/search?content_type=tutorial')
        data = response.get_json()
        
        tutorials = [s for s in data['data']['submissions'] if s['content_type'] == 'tutorial']
        assert len(tutorials) >= 1
        
        # Test minimum rating filter
        response = client.get('/api/v1/content/search?min_rating=4.5')
        data = response.get_json()
        
        high_rated = [s for s in data['data']['submissions'] if s['average_rating'] >= 4.5]
        assert len(high_rated) >= 1
        
        # Results should be ordered by featured first, then rating/views
        if len(data['data']['submissions']) > 1:
            first_result = data['data']['submissions'][0]
            # Featured content should appear first
            featured_results = [s for s in data['data']['submissions'] if s['is_featured']]
            if featured_results:
                assert data['data']['submissions'][0]['is_featured'] == True


class TestLicensingSystem:
    """Test copyright and licensing management."""
    
    def test_create_content_license(self, test_user):
        """Test creating different types of content licenses."""
        submission = ContentSubmission(
            title='Test Song for Licensing',
            submitter_id=test_user.id,
            content_type='song'
        )
        db.session.add(submission)
        db.session.flush()
        
        # Test Creative Commons license
        cc_license = ContentLicense(
            submission_id=submission.id,
            license_type='CC BY-SA 4.0',
            copyright_holder='Test User'
        )
        
        assert cc_license.attribution_required == True
        assert cc_license.derivative_works_allowed == True
        assert cc_license.share_alike_required == True
        assert cc_license.commercial_use_allowed == True
        
        # Test original work license
        original_license = ContentLicense(
            submission_id=submission.id,
            license_type='original',
            copyright_holder='Test User',
            is_original_work=True
        )
        
        assert original_license.is_original_work == True
        assert original_license.attribution_required == True
        
        # Test public domain license
        pd_license = ContentLicense(
            submission_id=submission.id,
            license_type='public_domain'
        )
        
        assert pd_license.attribution_required == False
        assert pd_license.commercial_use_allowed == True
        assert pd_license.derivative_works_allowed == True


class TestReputationIntegration:
    """Test integration with user reputation system."""
    
    def test_reputation_updates_from_content_activities(self, authenticated_client, test_user, second_user):
        """Test that content activities update user reputation."""
        # Initial reputation check
        initial_reputation = UserReputation.query.filter_by(user_id=test_user.id).first()
        initial_score = initial_reputation.total_score if initial_reputation else 0
        
        # Submit content (should give +5 points)
        submission_data = {
            'title': 'Test Song for Reputation',
            'content_type': 'song',
            'content_data': {
                'chordpro_content': '{title: Test}\n[C]Test content'
            }
        }
        
        response = authenticated_client.post('/api/v1/content/submit', json=submission_data)
        assert response.status_code == 201
        
        # Check reputation increase
        updated_reputation = UserReputation.query.filter_by(user_id=test_user.id).first()
        assert updated_reputation.total_score == initial_score + 5
        assert updated_reputation.posts_created == 1
        
        # Submit review (should give +3 points)
        submission_id = response.get_json()['data']['submission']['id']
        
        # Create another submission to review
        other_submission = ContentSubmission(
            title='Another Song to Review',
            submitter_id=second_user.id,
            content_type='song',
            status='under_review'
        )
        db.session.add(other_submission)
        db.session.commit()
        
        review_data = {'rating': 4, 'review_text': 'Good song'}
        response = authenticated_client.post(
            f'/api/v1/content/submissions/{other_submission.id}/review',
            json=review_data
        )
        assert response.status_code == 201
        
        # Check reputation increase from review
        final_reputation = UserReputation.query.filter_by(user_id=test_user.id).first()
        assert final_reputation.total_score == initial_score + 5 + 3  # Submission + Review


# Fixtures for testing

@pytest.fixture
def test_user(app):
    """Create a test user."""
    with app.app_context():
        user = User(email='testuser@example.com', password='testpass123')
        db.session.add(user)
        db.session.commit()
        return user


@pytest.fixture
def second_user(app):
    """Create a second test user."""
    with app.app_context():
        user = User(email='seconduser@example.com', password='testpass123')
        db.session.add(user)
        db.session.commit()
        return user


@pytest.fixture
def authenticated_client(client, test_user):
    """Create an authenticated client."""
    # Login the test user
    login_data = {
        'email': 'testuser@example.com',
        'password': 'testpass123'
    }
    response = client.post('/api/v1/auth/login', json=login_data)
    assert response.status_code == 200
    
    token = response.get_json()['data']['token']
    
    # Add authorization header to all requests
    client.environ_base['HTTP_AUTHORIZATION'] = f'Bearer {token}'
    
    return client