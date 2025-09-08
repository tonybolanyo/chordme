#!/usr/bin/env python3
"""
Tests for Universal Music Metadata System Backend API
"""

import pytest
import json
from datetime import datetime
from chordme import app, db
from chordme.metadata_routes import metadata_service


@pytest.fixture
def client():
    """Create a test client"""
    app.config['TESTING'] = True
    app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///:memory:'
    
    with app.test_client() as client:
        with app.app_context():
            db.create_all()
            yield client
            db.drop_all()


@pytest.fixture
def sample_spotify_data():
    """Sample Spotify track data"""
    return {
        "id": "spotify123",
        "name": "Test Song",
        "artists": [{"id": "artist1", "name": "Test Artist"}],
        "album": {
            "id": "album1",
            "name": "Test Album",
            "release_date": "2023-01-01",
            "images": [{"url": "image.jpg", "width": 400, "height": 400}]
        },
        "duration_ms": 240000,
        "explicit": False,
        "popularity": 75,
        "preview_url": "preview.mp3",
        "track_number": 1,
        "external_urls": {"spotify": "spotify.com/track/123"},
        "external_ids": {"isrc": "US1234567890"}
    }


@pytest.fixture
def sample_apple_music_data():
    """Sample Apple Music track data"""
    return {
        "id": "apple123",
        "type": "songs",
        "href": "apple.com",
        "attributes": {
            "name": "Test Song",
            "artistName": "Test Artist",
            "albumName": "Test Album",
            "durationInMillis": 240000,
            "artwork": {"url": "image.jpg", "width": 400, "height": 400},
            "genreNames": ["Pop"],
            "isrc": "US1234567890",
            "previews": [{"url": "preview.mp3"}],
            "releaseDate": "2023-01-01",
            "url": "apple.com/song"
        }
    }


class TestUniversalMetadataService:
    """Test the core metadata service functionality"""
    
    def test_create_unified_metadata_with_spotify_only(self, sample_spotify_data):
        """Test creating unified metadata with only Spotify data"""
        platform_data = {"spotify": sample_spotify_data}
        
        result = metadata_service.create_unified_metadata(platform_data)
        
        assert "platforms" in result
        assert "normalized" in result
        assert "quality" in result
        assert "conflicts" in result
        assert "lastUpdated" in result
        assert "cacheExpiry" in result
        
        # Check normalized data
        assert result["normalized"]["title"] == "Test Song"
        assert result["normalized"]["artists"] == ["Test Artist"]
        assert result["normalized"]["album"] == "Test Album"
        assert result["normalized"]["durationMs"] == 240000
        
        # Check quality metrics
        assert result["quality"]["overall"] > 0.5
        assert len(result["quality"]["sources"]) == 1
        assert len(result["conflicts"]) == 0
    
    def test_create_unified_metadata_with_both_platforms(self, sample_spotify_data, sample_apple_music_data):
        """Test creating unified metadata with both platforms"""
        platform_data = {
            "spotify": sample_spotify_data,
            "apple_music": sample_apple_music_data
        }
        
        result = metadata_service.create_unified_metadata(platform_data)
        
        assert len(result["quality"]["sources"]) == 2
        assert result["quality"]["overall"] > 0.7  # Should be higher with two sources
        assert result["normalized"]["genres"] == ["Pop"]  # From Apple Music
        assert result["normalized"]["isrc"] == "US1234567890"  # Available in both
    
    def test_conflict_detection(self, sample_spotify_data, sample_apple_music_data):
        """Test conflict detection between platforms"""
        # Modify Apple Music data to create conflicts
        modified_apple_data = sample_apple_music_data.copy()
        modified_apple_data["attributes"]["name"] = "Test Song (Extended Version)"
        modified_apple_data["attributes"]["durationInMillis"] = 250000  # 10 second difference
        
        platform_data = {
            "spotify": sample_spotify_data,
            "apple_music": modified_apple_data
        }
        
        result = metadata_service.create_unified_metadata(platform_data)
        
        # Should detect title and duration conflicts
        conflict_fields = [c["field"] for c in result["conflicts"]]
        assert "title" in conflict_fields
        assert "duration" in conflict_fields
        assert result["quality"]["consistency"] < 1.0
    
    def test_source_confidence_calculation(self, sample_spotify_data, sample_apple_music_data):
        """Test source confidence calculation"""
        # Test Spotify confidence
        spotify_confidence = metadata_service._calculate_source_confidence("spotify", sample_spotify_data)
        assert 0.0 <= spotify_confidence <= 1.0
        assert spotify_confidence > 0.5  # Should be reasonably confident with complete data
        
        # Test Apple Music confidence
        apple_confidence = metadata_service._calculate_source_confidence("apple-music", sample_apple_music_data)
        assert 0.0 <= apple_confidence <= 1.0
        
        # Spotify should generally have slightly higher confidence due to popularity data
        assert spotify_confidence >= apple_confidence
    
    def test_data_completeness_check(self, sample_spotify_data, sample_apple_music_data):
        """Test data completeness checking"""
        # Complete data
        assert metadata_service._is_data_complete("spotify", sample_spotify_data) == True
        assert metadata_service._is_data_complete("apple-music", sample_apple_music_data) == True
        
        # Incomplete data
        incomplete_spotify = {"name": "Test Song"}  # Missing required fields
        assert metadata_service._is_data_complete("spotify", incomplete_spotify) == False
        
        incomplete_apple = {"attributes": {"name": "Test Song"}}  # Missing required fields
        assert metadata_service._is_data_complete("apple-music", incomplete_apple) == False
    
    def test_quality_score_calculation(self, sample_spotify_data, sample_apple_music_data):
        """Test metadata quality score calculation"""
        platform_data = {
            "spotify": sample_spotify_data,
            "apple_music": sample_apple_music_data
        }
        
        result = metadata_service.create_unified_metadata(platform_data)
        quality = result["quality"]
        
        # Check all quality components
        assert 0.0 <= quality["overall"] <= 1.0
        assert 0.0 <= quality["completeness"] <= 1.0
        assert 0.0 <= quality["accuracy"] <= 1.0
        assert 0.0 <= quality["consistency"] <= 1.0
        assert quality["freshness"] == 1.0  # Should be fresh
        
        # Verification status should be appropriate
        assert quality["verificationStatus"] in ["verified", "unverified", "disputed"]


class TestMetadataAPIEndpoints:
    """Test the metadata API endpoints"""
    
    def test_enrich_metadata_endpoint(self, client, sample_spotify_data, sample_apple_music_data):
        """Test the /metadata/enrich endpoint"""
        payload = {
            "platforms": {
                "spotify": sample_spotify_data,
                "apple_music": sample_apple_music_data
            }
        }
        
        response = client.post(
            '/api/v1/metadata/enrich',
            data=json.dumps(payload),
            content_type='application/json'
        )
        
        assert response.status_code == 200
        data = json.loads(response.data)
        
        assert data["status"] == "success"
        assert "data" in data
        assert "platforms" in data["data"]
        assert "normalized" in data["data"]
        assert "quality" in data["data"]
    
    def test_enrich_metadata_with_quality_threshold(self, client, sample_spotify_data):
        """Test metadata enrichment with quality threshold"""
        payload = {
            "platforms": {
                "spotify": sample_spotify_data
            },
            "options": {
                "qualityThreshold": 0.9  # High threshold
            }
        }
        
        response = client.post(
            '/api/v1/metadata/enrich',
            data=json.dumps(payload),
            content_type='application/json'
        )
        
        assert response.status_code == 200
        data = json.loads(response.data)
        
        # Should warn about quality threshold if score is below 0.9
        # (depends on actual quality score calculated)
        assert data["status"] in ["success", "warning"]
    
    def test_batch_enrich_metadata_endpoint(self, client, sample_spotify_data, sample_apple_music_data):
        """Test the /metadata/batch-enrich endpoint"""
        payload = {
            "tracks": [
                {
                    "id": "track1",
                    "platforms": {"spotify": sample_spotify_data}
                },
                {
                    "id": "track2",
                    "platforms": {"apple_music": sample_apple_music_data}
                }
            ],
            "options": {
                "batchSize": 10,
                "includeFailures": True
            }
        }
        
        response = client.post(
            '/api/v1/metadata/batch-enrich',
            data=json.dumps(payload),
            content_type='application/json'
        )
        
        assert response.status_code == 200
        data = json.loads(response.data)
        
        assert data["status"] == "success"
        assert data["data"]["totalProcessed"] == 2
        assert data["data"]["successCount"] >= 0
        assert len(data["data"]["results"]) == 2
    
    def test_quality_score_endpoint(self, client, sample_spotify_data, sample_apple_music_data):
        """Test the /metadata/quality-score endpoint"""
        payload = {
            "platforms": {
                "spotify": sample_spotify_data,
                "apple_music": sample_apple_music_data
            }
        }
        
        response = client.post(
            '/api/v1/metadata/quality-score',
            data=json.dumps(payload),
            content_type='application/json'
        )
        
        assert response.status_code == 200
        data = json.loads(response.data)
        
        assert data["status"] == "success"
        assert "qualityScore" in data["data"]
        assert "breakdown" in data["data"]
        assert 0.0 <= data["data"]["qualityScore"] <= 1.0
    
    def test_health_check_endpoint(self, client):
        """Test the metadata service health check"""
        response = client.get('/api/v1/metadata/health')
        
        assert response.status_code == 200
        data = json.loads(response.data)
        
        assert data["status"] == "healthy"
        assert data["service"] == "Universal Music Metadata System"
        assert "timestamp" in data
    
    def test_error_handling_no_platforms(self, client):
        """Test error handling when no platforms provided"""
        payload = {"platforms": {}}
        
        response = client.post(
            '/api/v1/metadata/enrich',
            data=json.dumps(payload),
            content_type='application/json'
        )
        
        assert response.status_code == 400
        data = json.loads(response.data)
        assert data["status"] == "error"
    
    def test_error_handling_invalid_json(self, client):
        """Test error handling with invalid JSON"""
        response = client.post(
            '/api/v1/metadata/enrich',
            data='invalid json',
            content_type='application/json'
        )
        
        assert response.status_code == 400
    
    def test_batch_error_handling(self, client):
        """Test batch processing error handling"""
        payload = {
            "tracks": [
                {
                    "id": "track1",
                    "platforms": {}  # Empty platforms should cause error
                },
                {
                    "id": "track2"
                    # Missing platforms entirely
                }
            ]
        }
        
        response = client.post(
            '/api/v1/metadata/batch-enrich',
            data=json.dumps(payload),
            content_type='application/json'
        )
        
        assert response.status_code == 200  # Should succeed but report failures
        data = json.loads(response.data)
        
        assert data["data"]["failureCount"] > 0
        assert data["data"]["successCount"] == 0


class TestMetadataConflictResolution:
    """Test conflict resolution algorithms"""
    
    def test_confidence_based_resolution(self, sample_spotify_data, sample_apple_music_data):
        """Test confidence-based conflict resolution"""
        # Create conflicting data where Spotify has higher confidence
        modified_spotify = sample_spotify_data.copy()
        modified_spotify["popularity"] = 90  # High popularity = high confidence
        
        modified_apple = sample_apple_music_data.copy()
        modified_apple["attributes"]["name"] = "Different Song Title"
        
        platform_data = {
            "spotify": modified_spotify,
            "apple_music": modified_apple
        }
        
        result = metadata_service.create_unified_metadata(platform_data)
        
        # Should prefer Spotify title due to higher confidence
        assert result["normalized"]["title"] == "Test Song"
        
        # Check that conflict was resolved
        title_conflict = next((c for c in result["conflicts"] if c["field"] == "title"), None)
        if title_conflict:
            assert title_conflict["resolvedValue"] == "Test Song"
    
    def test_string_similarity_calculation(self):
        """Test string similarity calculation"""
        # Identical strings
        assert metadata_service._string_similarity("test", "test") == 1.0
        
        # Completely different strings
        similarity = metadata_service._string_similarity("hello", "world")
        assert 0.0 <= similarity < 1.0
        
        # Similar strings
        similarity = metadata_service._string_similarity("test song", "test track")
        assert similarity > 0.5
        
        # Empty strings
        assert metadata_service._string_similarity("", "") == 0.0
        assert metadata_service._string_similarity("test", "") == 0.0


class TestMetadataCaching:
    """Test metadata caching functionality"""
    
    def test_cache_behavior(self, sample_spotify_data):
        """Test basic caching behavior"""
        platform_data = {"spotify": sample_spotify_data}
        
        # First call should create cache entry
        result1 = metadata_service.create_unified_metadata(platform_data)
        
        # Second call should return cached result (same timestamp)
        result2 = metadata_service.create_unified_metadata(platform_data)
        
        # Results should be functionally equivalent
        assert result1["normalized"]["title"] == result2["normalized"]["title"]
        assert result1["quality"]["overall"] == result2["quality"]["overall"]


class TestMetadataIntegration:
    """Test integration scenarios"""
    
    def test_real_world_spotify_data_structure(self):
        """Test with realistic Spotify API response structure"""
        realistic_spotify = {
            "album": {
                "album_type": "album",
                "artists": [{"external_urls": {"spotify": "https://open.spotify.com/artist/0TnOYISbd1XYRBk9myaseg"}, "href": "https://api.spotify.com/v1/artists/0TnOYISbd1XYRBk9myaseg", "id": "0TnOYISbd1XYRBk9myaseg", "name": "Pitbull", "type": "artist", "uri": "spotify:artist:0TnOYISbd1XYRBk9myaseg"}],
                "external_urls": {"spotify": "https://open.spotify.com/album/3wQpUs7OWGz2ZfHhT3IfMI"},
                "href": "https://api.spotify.com/v1/albums/3wQpUs7OWGz2ZfHhT3IfMI",
                "id": "3wQpUs7OWGz2ZfHhT3IfMI",
                "images": [{"height": 640, "url": "https://i.scdn.co/image/ab67616d0000b273b21c4a0a4ba1a4d89f57af9f", "width": 640}],
                "name": "Libertad 548",
                "release_date": "2019-09-27",
                "release_date_precision": "day",
                "total_tracks": 12,
                "type": "album",
                "uri": "spotify:album:3wQpUs7OWGz2ZfHhT3IfMI"
            },
            "artists": [{"external_urls": {"spotify": "https://open.spotify.com/artist/0TnOYISbd1XYRBk9myaseg"}, "href": "https://api.spotify.com/v1/artists/0TnOYISbd1XYRBk9myaseg", "id": "0TnOYISbd1XYRBk9myaseg", "name": "Pitbull", "type": "artist", "uri": "spotify:artist:0TnOYISbd1XYRBk9myaseg"}],
            "disc_number": 1,
            "duration_ms": 190320,
            "explicit": False,
            "external_ids": {"isrc": "USQX91950066"},
            "external_urls": {"spotify": "https://open.spotify.com/track/6DCZcSspjsKoFjzjrWoCdn"},
            "href": "https://api.spotify.com/v1/tracks/6DCZcSspjsKoFjzjrWoCdn",
            "id": "6DCZcSspjsKoFjzjrWoCdn",
            "is_local": False,
            "name": "No Lo Trates",
            "popularity": 73,
            "preview_url": "https://p.scdn.co/mp3-preview/8b89a8c16b8b8d6b6b8b8d6b6b8b8d6b6b8b8d6b",
            "track_number": 1,
            "type": "track",
            "uri": "spotify:track:6DCZcSspjsKoFjzjrWoCdn"
        }
        
        platform_data = {"spotify": realistic_spotify}
        result = metadata_service.create_unified_metadata(platform_data)
        
        assert result["normalized"]["title"] == "No Lo Trates"
        assert result["normalized"]["artists"] == ["Pitbull"]
        assert result["normalized"]["album"] == "Libertad 548"
        assert result["normalized"]["durationMs"] == 190320
        assert result["normalized"]["isrc"] == "USQX91950066"
        assert result["quality"]["overall"] > 0.7  # Should be high quality with complete data
    
    def test_missing_optional_fields(self):
        """Test handling of missing optional fields"""
        minimal_spotify = {
            "id": "test123",
            "name": "Minimal Song",
            "artists": [{"name": "Test Artist"}],
            "album": {"name": "Test Album"},
            "duration_ms": 180000
            # Missing: preview_url, external_ids, popularity, etc.
        }
        
        platform_data = {"spotify": minimal_spotify}
        result = metadata_service.create_unified_metadata(platform_data)
        
        assert result["normalized"]["title"] == "Minimal Song"
        assert result["normalized"]["isrc"] is None
        assert result["normalized"]["previewUrls"]["spotify"] is None
        assert result["quality"]["completeness"] < 1.0  # Should reflect missing data


if __name__ == '__main__':
    pytest.main([__file__])