"""
Test suite for forum functionality.
Tests forum categories, threads, posts, voting, and reputation system.
"""

import pytest
import json
from chordme import app, db
from chordme.models import (User, ForumCategory, ForumThread, ForumPost, 
                           ForumVote, UserReputation, UserBadge)


@pytest.fixture
def client():
    """Test client fixture."""
    app.config['TESTING'] = True
    app.config['WTF_CSRF_ENABLED'] = False
    app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///:memory:'
    
    with app.test_client() as client:
        with app.app_context():
            db.create_all()
            yield client
            db.session.remove()
            db.drop_all()


@pytest.fixture
def test_user(client):
    """Create a test user."""
    with app.app_context():
        user = User(email='test@example.com', password='password123')
        db.session.add(user)
        db.session.commit()
        return user


@pytest.fixture
def test_category(client):
    """Create a test forum category."""
    with app.app_context():
        category = ForumCategory(
            name='General Discussion',
            slug='general',
            description='General discussions about ChordMe'
        )
        db.session.add(category)
        db.session.commit()
        return category


class TestForumCategories:
    """Test forum category functionality."""
    
    def test_get_forum_categories_empty(self, client):
        """Test getting categories when none exist."""
        response = client.get('/api/v1/forum/categories')
        assert response.status_code == 200
        
        data = json.loads(response.data)
        assert data['status'] == 'success'
        assert data['data']['categories'] == []
    
    def test_get_forum_categories_with_data(self, client, test_category):
        """Test getting categories with data."""
        response = client.get('/api/v1/forum/categories')
        assert response.status_code == 200
        
        data = json.loads(response.data)
        assert data['status'] == 'success'
        assert len(data['data']['categories']) == 1
        
        category = data['data']['categories'][0]
        assert category['name'] == 'General Discussion'
        assert category['slug'] == 'general'
        assert category['thread_count'] == 0
        assert category['post_count'] == 0
    
    def test_create_forum_category_no_auth(self, client):
        """Test creating category without authentication."""
        response = client.post('/api/v1/forum/categories', 
                              json={'name': 'Test', 'slug': 'test'})
        assert response.status_code == 401
    
    def test_create_forum_category_invalid_data(self, client, test_user):
        """Test creating category with invalid data."""
        # Mock JWT token for authentication
        with app.app_context():
            from chordme.utils import generate_jwt_token
            token = generate_jwt_token(test_user.id)
        
        # Missing required fields
        response = client.post('/api/v1/forum/categories',
                              json={},
                              headers={'Authorization': f'Bearer {token}'})
        assert response.status_code == 400
        
        # Invalid slug format
        response = client.post('/api/v1/forum/categories',
                              json={'name': 'Test', 'slug': 'Test Space!'},
                              headers={'Authorization': f'Bearer {token}'})
        assert response.status_code == 400


class TestForumThreads:
    """Test forum thread functionality."""
    
    def test_get_category_threads_empty(self, client, test_category):
        """Test getting threads from empty category."""
        response = client.get(f'/api/v1/forum/categories/{test_category.slug}/threads')
        assert response.status_code == 200
        
        data = json.loads(response.data)
        assert data['status'] == 'success'
        assert data['data']['threads'] == []
        assert data['data']['category']['name'] == test_category.name
    
    def test_get_category_threads_nonexistent(self, client):
        """Test getting threads from nonexistent category."""
        response = client.get('/api/v1/forum/categories/nonexistent/threads')
        assert response.status_code == 404
    
    def test_create_thread_no_auth(self, client, test_category):
        """Test creating thread without authentication."""
        response = client.post('/api/v1/forum/threads',
                              json={
                                  'title': 'Test Thread',
                                  'content': 'Test content',
                                  'category_id': test_category.id
                              })
        assert response.status_code == 401
    
    def test_create_thread_success(self, client, test_user, test_category):
        """Test successful thread creation."""
        with app.app_context():
            from chordme.utils import generate_jwt_token
            token = generate_jwt_token(test_user.id)
        
        response = client.post('/api/v1/forum/threads',
                              json={
                                  'title': 'My First Thread',
                                  'content': 'This is my first post!',
                                  'category_id': test_category.id,
                                  'thread_type': 'discussion'
                              },
                              headers={'Authorization': f'Bearer {token}'})
        assert response.status_code == 201
        
        data = json.loads(response.data)
        assert data['status'] == 'success'
        
        thread = data['data']['thread']
        assert thread['title'] == 'My First Thread'
        assert thread['author_id'] == test_user.id
        assert thread['category_id'] == test_category.id
        assert thread['thread_type'] == 'discussion'


class TestVotingSystem:
    """Test voting system functionality."""
    
    def test_vote_on_nonexistent_thread(self, client, test_user):
        """Test voting on nonexistent thread."""
        with app.app_context():
            from chordme.utils import generate_jwt_token
            token = generate_jwt_token(test_user.id)
        
        response = client.post('/api/v1/forum/threads/999/vote',
                              json={'vote_type': 'upvote'},
                              headers={'Authorization': f'Bearer {token}'})
        assert response.status_code == 404
    
    def test_vote_invalid_type(self, client, test_user):
        """Test voting with invalid vote type."""
        with app.app_context():
            from chordme.utils import generate_jwt_token
            token = generate_jwt_token(test_user.id)
        
        response = client.post('/api/v1/forum/threads/1/vote',
                              json={'vote_type': 'invalid'},
                              headers={'Authorization': f'Bearer {token}'})
        assert response.status_code == 400


class TestUserReputation:
    """Test user reputation system."""
    
    def test_get_user_reputation_new_user(self, client, test_user):
        """Test getting reputation for new user."""
        response = client.get(f'/api/v1/forum/users/{test_user.id}/reputation')
        assert response.status_code == 200
        
        data = json.loads(response.data)
        assert data['status'] == 'success'
        
        reputation = data['data']['reputation']
        assert reputation['total_score'] == 0
        assert reputation['level'] == 1
        assert reputation['level_name'] == 'Newcomer'
    
    def test_get_user_reputation_nonexistent(self, client):
        """Test getting reputation for nonexistent user."""
        response = client.get('/api/v1/forum/users/999/reputation')
        assert response.status_code == 404


class TestForumSearch:
    """Test forum search functionality."""
    
    def test_search_empty_query(self, client):
        """Test search with empty query."""
        response = client.get('/api/v1/forum/search?q=')
        assert response.status_code == 400
    
    def test_search_short_query(self, client):
        """Test search with too short query."""
        response = client.get('/api/v1/forum/search?q=a')
        assert response.status_code == 400
    
    def test_search_valid_query(self, client):
        """Test search with valid query."""
        response = client.get('/api/v1/forum/search?q=test')
        assert response.status_code == 200
        
        data = json.loads(response.data)
        assert data['status'] == 'success'
        assert 'threads' in data['data']
        assert 'posts' in data['data']
        assert 'total' in data['data']


class TestForumBadges:
    """Test forum badge system."""
    
    def test_get_forum_badges_empty(self, client):
        """Test getting badges when none exist."""
        response = client.get('/api/v1/forum/badges')
        assert response.status_code == 200
        
        data = json.loads(response.data)
        assert data['status'] == 'success'
        assert data['data']['badges'] == []


class TestForumModeration:
    """Test forum moderation functionality."""
    
    def test_lock_thread_no_auth(self, client):
        """Test locking thread without authentication."""
        response = client.post('/api/v1/forum/threads/1/lock',
                              json={'reason': 'Test reason'})
        assert response.status_code == 401
    
    def test_lock_nonexistent_thread(self, client, test_user):
        """Test locking nonexistent thread."""
        with app.app_context():
            from chordme.utils import generate_jwt_token
            token = generate_jwt_token(test_user.id)
        
        response = client.post('/api/v1/forum/threads/999/lock',
                              json={'reason': 'Test reason'},
                              headers={'Authorization': f'Bearer {token}'})
        assert response.status_code == 404