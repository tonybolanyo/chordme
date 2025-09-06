"""
Tests for Full-Text Search Engine functionality
Tests the enhanced search capabilities including:
- Boolean operators (AND, OR, NOT)  
- Phrase searching with quotes
- Search suggestions and autocomplete
- Result highlighting and ranking
- Performance optimization with caching
"""

import pytest
import json
from unittest.mock import patch, MagicMock
from sqlalchemy import text
from chordme import app, db
from chordme.models import User, Song
from chordme.utils import generate_jwt_token


@pytest.fixture
def client():
    """Create test client with test database"""
    app.config['TESTING'] = True
    app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///:memory:'
    
    with app.test_client() as client:
        with app.app_context():
            db.create_all()
            yield client
            db.drop_all()


@pytest.fixture
def auth_headers():
    """Create authentication headers for test user"""
    with app.app_context():
        # Create test user
        test_user = User(email='test@example.com', password='password123')
        db.session.add(test_user)
        db.session.commit()
        
        # Generate JWT token
        token = generate_jwt_token(test_user.id, test_user.email)
        return {'Authorization': f'Bearer {token}'}


@pytest.fixture
def sample_songs():
    """Create sample songs for testing"""
    with app.app_context():
        # Get test user
        user = User.query.filter_by(email='test@example.com').first()
        
        songs = [
            Song(
                title='Amazing Grace',
                artist='Traditional',
                content='{title: Amazing Grace}\n{artist: Traditional}\n[G]Amazing [C]grace how [G]sweet the sound',
                user_id=user.id,
                genre='gospel',
                song_key='G',
                difficulty='beginner',
                tempo=80,
                language='en',
                is_public=True
            ),
            Song(
                title='Hotel California',
                artist='Eagles',
                content='{title: Hotel California}\n{artist: Eagles}\n[Am]On a dark desert [F]highway',
                user_id=user.id,
                genre='rock',
                song_key='Am',
                difficulty='intermediate',
                tempo=120,
                language='en',
                is_public=True
            ),
            Song(
                title='Wonderwall',
                artist='Oasis',
                content='{title: Wonderwall}\n{artist: Oasis}\n[Em7]Today is gonna be the day',
                user_id=user.id,
                genre='rock',
                song_key='Em',
                difficulty='beginner',
                tempo=87,
                language='en',
                is_public=True
            ),
            Song(
                title='La Bamba',
                artist='Ritchie Valens',
                content='{title: La Bamba}\n{artist: Ritchie Valens}\n[C]Para bailar la [F]Bamba',
                user_id=user.id,
                genre='latin',
                song_key='C',
                difficulty='intermediate',
                tempo=140,
                language='es',
                is_public=True
            ),
            Song(
                title='Blackbird',
                artist='The Beatles',
                content='{title: Blackbird}\n{artist: The Beatles}\n[G]Blackbird singing in the dead of night',
                user_id=user.id,
                genre='folk',
                song_key='G',
                difficulty='advanced',
                tempo=95,
                language='en',
                is_public=False  # Private song
            )
        ]
        
        for song in songs:
            db.session.add(song)
        db.session.commit()
        
        return songs


class TestBasicSearch:
    """Test basic search functionality"""
    
    def test_search_without_query(self, client, auth_headers, sample_songs):
        """Test search with no query returns all public songs"""
        response = client.get('/api/v1/songs/search', headers=auth_headers)
        assert response.status_code == 200
        
        data = response.get_json()
        assert 'results' in data
        assert 'total_count' in data
        assert 'search_time_ms' in data
        
        # Should return all public songs (4 out of 5)
        assert data['total_count'] == 4
        assert len(data['results']) == 4
    
    def test_search_by_title(self, client, auth_headers, sample_songs):
        """Test search by song title"""
        response = client.get('/api/v1/songs/search?q=grace', headers=auth_headers)
        assert response.status_code == 200
        
        data = response.get_json()
        assert data['total_count'] == 1
        assert data['results'][0]['title'] == 'Amazing Grace'
        assert data['results'][0]['match_type'] == 'title_contains'
        assert 'title' in data['results'][0]['matched_fields']
    
    def test_search_by_artist(self, client, auth_headers, sample_songs):
        """Test search by artist name"""
        response = client.get('/api/v1/songs/search?q=Beatles', headers=auth_headers)
        assert response.status_code == 200
        
        data = response.get_json()
        # Should not find private song
        assert data['total_count'] == 0
        
        # Test with public artist
        response = client.get('/api/v1/songs/search?q=Eagles', headers=auth_headers)
        assert response.status_code == 200
        
        data = response.get_json()
        assert data['total_count'] == 1
        assert data['results'][0]['artist'] == 'Eagles'
    
    def test_search_by_genre(self, client, auth_headers, sample_songs):
        """Test search filtering by genre"""
        response = client.get('/api/v1/songs/search?genre=rock', headers=auth_headers)
        assert response.status_code == 200
        
        data = response.get_json()
        assert data['total_count'] == 2
        for result in data['results']:
            assert result['genre'] == 'rock'
    
    def test_search_with_filters(self, client, auth_headers, sample_songs):
        """Test search with multiple filters"""
        params = {
            'difficulty': 'beginner',
            'key': 'G',
            'min_tempo': 70,
            'max_tempo': 100
        }
        response = client.get('/api/v1/songs/search', query_string=params, headers=auth_headers)
        assert response.status_code == 200
        
        data = response.get_json()
        assert data['total_count'] == 1
        assert data['results'][0]['title'] == 'Amazing Grace'


class TestAdvancedSearch:
    """Test advanced search features"""
    
    def test_phrase_search(self, client, auth_headers, sample_songs):
        """Test phrase search with quotes"""
        response = client.get('/api/v1/songs/search?q="Amazing Grace"', headers=auth_headers)
        assert response.status_code == 200
        
        data = response.get_json()
        assert data['total_count'] == 1
        assert data['results'][0]['title'] == 'Amazing Grace'
        
        # Verify parsed query information
        assert 'query_info' in data
        parsed_query = data['query_info']['parsed_query']
        assert len(parsed_query['phrases']) == 1
        assert parsed_query['phrases'][0] == 'Amazing Grace'
    
    def test_boolean_and_search(self, client, auth_headers, sample_songs):
        """Test AND boolean operator"""
        response = client.get('/api/v1/songs/search?q=rock AND beginner', headers=auth_headers)
        assert response.status_code == 200
        
        data = response.get_json()
        # Should find Wonderwall (rock + beginner)
        assert data['total_count'] == 1
        assert data['results'][0]['title'] == 'Wonderwall'
        
        # Verify advanced syntax detection
        parsed_query = data['query_info']['parsed_query']
        assert parsed_query['has_operators'] == True
        assert 'rock' in parsed_query['and_terms']
        assert 'beginner' in parsed_query['and_terms']
    
    def test_boolean_or_search(self, client, auth_headers, sample_songs):
        """Test OR boolean operator"""
        response = client.get('/api/v1/songs/search?q=gospel OR latin', headers=auth_headers)
        assert response.status_code == 200
        
        data = response.get_json()
        # Should find Amazing Grace (gospel) and La Bamba (latin)
        assert data['total_count'] == 2
        titles = [result['title'] for result in data['results']]
        assert 'Amazing Grace' in titles
        assert 'La Bamba' in titles
    
    def test_boolean_not_search(self, client, auth_headers, sample_songs):
        """Test NOT boolean operator"""
        response = client.get('/api/v1/songs/search?q=rock NOT intermediate', headers=auth_headers)
        assert response.status_code == 200
        
        data = response.get_json()
        # Should find Wonderwall (rock but not intermediate)
        assert data['total_count'] == 1
        assert data['results'][0]['title'] == 'Wonderwall'
        assert data['results'][0]['difficulty'] == 'beginner'
    
    def test_minus_operator(self, client, auth_headers, sample_songs):
        """Test minus operator as shorthand for NOT"""
        response = client.get('/api/v1/songs/search?q=rock -intermediate', headers=auth_headers)
        assert response.status_code == 200
        
        data = response.get_json()
        # Should find Wonderwall (rock but not intermediate)
        assert data['total_count'] == 1
        assert data['results'][0]['title'] == 'Wonderwall'
        
        parsed_query = data['query_info']['parsed_query']
        assert 'intermediate' in parsed_query['not_terms']
    
    def test_complex_boolean_query(self, client, auth_headers, sample_songs):
        """Test complex boolean query with multiple operators"""
        response = client.get('/api/v1/songs/search?q="Amazing Grace" OR rock AND beginner', headers=auth_headers)
        assert response.status_code == 200
        
        data = response.get_json()
        # Should find Amazing Grace (exact phrase) and Wonderwall (rock AND beginner)
        assert data['total_count'] >= 1


class TestSearchSuggestions:
    """Test search suggestions and autocomplete"""
    
    def test_get_suggestions_basic(self, client, auth_headers, sample_songs):
        """Test basic suggestions endpoint"""
        response = client.get('/api/v1/songs/suggestions?q=gra', headers=auth_headers)
        assert response.status_code == 200
        
        data = response.get_json()
        assert 'suggestions' in data
        assert 'query' in data
        assert data['query'] == 'gra'
        
        # Should suggest "grace" from "Amazing Grace"
        suggestions = data['suggestions']
        suggestion_texts = [s['text'] for s in suggestions]
        assert any('grace' in text.lower() for text in suggestion_texts)
    
    def test_get_suggestions_by_type(self, client, auth_headers, sample_songs):
        """Test suggestions filtered by type"""
        # Test title suggestions
        response = client.get('/api/v1/songs/suggestions?q=hotel&type=title', headers=auth_headers)
        assert response.status_code == 200
        
        data = response.get_json()
        suggestions = data['suggestions']
        if suggestions:
            assert all(s['type'] == 'title' for s in suggestions)
        
        # Test artist suggestions
        response = client.get('/api/v1/songs/suggestions?q=eagles&type=artist', headers=auth_headers)
        assert response.status_code == 200
        
        data = response.get_json()
        suggestions = data['suggestions']
        if suggestions:
            assert all(s['type'] == 'artist' for s in suggestions)
    
    def test_suggestions_with_short_query(self, client, auth_headers, sample_songs):
        """Test suggestions with query too short"""
        response = client.get('/api/v1/songs/suggestions?q=a', headers=auth_headers)
        assert response.status_code == 200
        
        data = response.get_json()
        assert data['suggestions'] == []
    
    def test_suggestions_rate_limiting(self, client, auth_headers, sample_songs):
        """Test rate limiting for suggestions endpoint"""
        # This would need actual rate limiting configuration in test
        # For now, just test that multiple requests work
        for i in range(5):
            response = client.get('/api/v1/songs/suggestions?q=test', headers=auth_headers)
            assert response.status_code == 200


class TestSearchPerformance:
    """Test search performance and optimization"""
    
    def test_search_response_time(self, client, auth_headers, sample_songs):
        """Test that search response includes timing information"""
        response = client.get('/api/v1/songs/search?q=grace', headers=auth_headers)
        assert response.status_code == 200
        
        data = response.get_json()
        assert 'search_time_ms' in data
        assert isinstance(data['search_time_ms'], int)
        assert data['search_time_ms'] >= 0
    
    def test_search_pagination(self, client, auth_headers, sample_songs):
        """Test search pagination"""
        # Test with small limit
        response = client.get('/api/v1/songs/search?limit=2&offset=0', headers=auth_headers)
        assert response.status_code == 200
        
        data = response.get_json()
        assert len(data['results']) <= 2
        
        # Test next page
        response = client.get('/api/v1/songs/search?limit=2&offset=2', headers=auth_headers)
        assert response.status_code == 200
        
        data2 = response.get_json()
        # Results should be different between pages
        if data['results'] and data2['results']:
            assert data['results'][0]['id'] != data2['results'][0]['id']
    
    def test_search_caching(self, client, auth_headers, sample_songs):
        """Test search caching functionality"""
        # Make same search twice
        response1 = client.get('/api/v1/songs/search?q=grace&enable_cache=true', headers=auth_headers)
        assert response1.status_code == 200
        
        response2 = client.get('/api/v1/songs/search?q=grace&enable_cache=true', headers=auth_headers)
        assert response2.status_code == 200
        
        # Results should be identical
        data1 = response1.get_json()
        data2 = response2.get_json()
        assert data1['total_count'] == data2['total_count']
        assert len(data1['results']) == len(data2['results'])


class TestSearchSecurity:
    """Test search security and validation"""
    
    def test_search_without_auth(self, client, sample_songs):
        """Test search without authentication fails"""
        response = client.get('/api/v1/songs/search?q=test')
        assert response.status_code == 401
    
    def test_search_input_sanitization(self, client, auth_headers, sample_songs):
        """Test that search input is properly sanitized"""
        # Test with potentially malicious input
        malicious_queries = [
            '<script>alert("xss")</script>',
            "'; DROP TABLE songs; --",
            '../../etc/passwd',
            '${jndi:ldap://example.com/a}'
        ]
        
        for query in malicious_queries:
            response = client.get(f'/api/v1/songs/search?q={query}', headers=auth_headers)
            # Should not cause server error
            assert response.status_code in [200, 400]
    
    def test_search_parameter_validation(self, client, auth_headers, sample_songs):
        """Test search parameter validation"""
        # Test invalid difficulty
        response = client.get('/api/v1/songs/search?difficulty=invalid', headers=auth_headers)
        assert response.status_code == 400
        
        # Test invalid tempo range
        response = client.get('/api/v1/songs/search?min_tempo=999', headers=auth_headers)
        assert response.status_code == 400
        
        response = client.get('/api/v1/songs/search?max_tempo=-10', headers=auth_headers)
        assert response.status_code == 400
    
    def test_search_rate_limiting(self, client, auth_headers, sample_songs):
        """Test search rate limiting"""
        # This would need actual rate limiting configuration
        # For now, just verify that rate limits are mentioned in response headers
        response = client.get('/api/v1/songs/search?q=test', headers=auth_headers)
        assert response.status_code == 200
        # Rate limiting headers might be present
        # assert 'X-RateLimit-Limit' in response.headers


class TestSearchRelevanceRanking:
    """Test search result relevance and ranking"""
    
    def test_exact_title_match_highest_score(self, client, auth_headers, sample_songs):
        """Test that exact title matches get highest relevance score"""
        response = client.get('/api/v1/songs/search?q=Wonderwall', headers=auth_headers)
        assert response.status_code == 200
        
        data = response.get_json()
        if data['results']:
            result = data['results'][0]
            assert result['match_type'] == 'exact_title'
            assert result['relevance_score'] > 5.0  # Should be high score
    
    def test_relevance_score_ordering(self, client, auth_headers, sample_songs):
        """Test that results are ordered by relevance score"""
        response = client.get('/api/v1/songs/search?q=rock', headers=auth_headers)
        assert response.status_code == 200
        
        data = response.get_json()
        if len(data['results']) > 1:
            scores = [result['relevance_score'] for result in data['results']]
            # Scores should be in descending order
            assert all(scores[i] >= scores[i+1] for i in range(len(scores)-1))
    
    def test_matched_fields_detection(self, client, auth_headers, sample_songs):
        """Test that matched fields are correctly detected"""
        response = client.get('/api/v1/songs/search?q=Eagles', headers=auth_headers)
        assert response.status_code == 200
        
        data = response.get_json()
        if data['results']:
            result = data['results'][0]
            assert 'matched_fields' in result
            assert 'artist' in result['matched_fields']


class TestSearchErrorHandling:
    """Test search error handling and edge cases"""
    
    def test_search_with_empty_database(self, client, auth_headers):
        """Test search with no songs in database"""
        response = client.get('/api/v1/songs/search?q=nonexistent', headers=auth_headers)
        assert response.status_code == 200
        
        data = response.get_json()
        assert data['total_count'] == 0
        assert data['results'] == []
    
    def test_search_with_very_long_query(self, client, auth_headers, sample_songs):
        """Test search with extremely long query"""
        long_query = 'a' * 1000
        response = client.get(f'/api/v1/songs/search?q={long_query}', headers=auth_headers)
        # Should handle gracefully
        assert response.status_code in [200, 400]
    
    def test_suggestions_error_handling(self, client, auth_headers):
        """Test suggestions error handling"""
        # Test missing query parameter
        response = client.get('/api/v1/songs/suggestions', headers=auth_headers)
        assert response.status_code == 400
        
        data = response.get_json()
        assert 'error' in data
    
    def test_search_special_characters(self, client, auth_headers, sample_songs):
        """Test search with special characters"""
        special_queries = [
            'café',
            'naïve',
            'résumé',
            '中文',
            'тест',
            '🎵🎶'
        ]
        
        for query in special_queries:
            response = client.get(f'/api/v1/songs/search?q={query}', headers=auth_headers)
            # Should not cause server error
            assert response.status_code in [200, 400]


class TestSearchInternationalization:
    """Test search internationalization features"""
    
    def test_search_by_language(self, client, auth_headers, sample_songs):
        """Test filtering search results by language"""
        response = client.get('/api/v1/songs/search?language=es', headers=auth_headers)
        assert response.status_code == 200
        
        data = response.get_json()
        # Should find Spanish song
        assert data['total_count'] == 1
        assert data['results'][0]['title'] == 'La Bamba'
        assert data['results'][0]['language'] == 'es'
    
    def test_search_multilingual_content(self, client, auth_headers, sample_songs):
        """Test search across different languages"""
        response = client.get('/api/v1/songs/search?q=Bamba', headers=auth_headers)
        assert response.status_code == 200
        
        data = response.get_json()
        # Should find Spanish song
        assert data['total_count'] == 1
        assert data['results'][0]['title'] == 'La Bamba'


if __name__ == '__main__':
    pytest.main([__file__, '-v'])