"""
Integration tests for PDF export with chord diagrams functionality.
"""

import pytest
from chordme import app, db
from chordme.models import User, Song
from datetime import datetime, UTC


def utc_now():
    """Helper function to get current UTC time."""
    return datetime.now(UTC)


@pytest.fixture
def app_instance():
    """Create a test Flask application."""
    app.config['TESTING'] = True
    app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///:memory:'
    app.config['SECRET_KEY'] = 'test-secret-key'
    app.config['WTF_CSRF_ENABLED'] = False
    
    with app.app_context():
        db.create_all()
        yield app
        db.drop_all()


@pytest.fixture
def client(app_instance):
    """Create a test client."""
    return app_instance.test_client()


@pytest.fixture
def auth_headers(app_instance, client):
    """Create authenticated user and return auth headers."""
    with app_instance.app_context():
        # Create test user
        user = User(
            email='test@example.com',
            password='test-password-123'
        )
        db.session.add(user)
        db.session.commit()
        
        # Create test song
        song = Song(
            title='Test Song',
            content="""{title: Test Song with Chords}
{artist: Test Artist}

[C]Hello [G]world
This is a [Am]test [F]song""",
            author_id=user.id
        )
        db.session.add(song)
        db.session.commit()
        
        # Mock JWT token generation for testing
        import jwt
        from datetime import timedelta
        
        token = jwt.encode(
            {
                'user_id': user.id,
                'exp': datetime.utcnow() + timedelta(hours=1)
            },
            app_instance.config['SECRET_KEY'],
            algorithm='HS256'
        )
        
        return {
            'Authorization': f'Bearer {token}',
            'Content-Type': 'application/json'
        }, user.id, song.id


class TestPDFExportWithChordDiagrams:
    """Test PDF export API with chord diagram functionality."""
    
    def test_pdf_export_without_chord_diagrams(self, client, auth_headers):
        """Test PDF export without chord diagrams (default behavior)."""
        headers, user_id, song_id = auth_headers
        
        response = client.get(
            f'/api/v1/songs/{song_id}/export/pdf',
            headers=headers
        )
        
        assert response.status_code == 200
        assert response.headers['Content-Type'] == 'application/pdf'
        assert response.data.startswith(b'%PDF')
        assert len(response.data) > 1000  # Reasonable PDF size
    
    def test_pdf_export_with_chord_diagrams_enabled(self, client, auth_headers):
        """Test PDF export with chord diagrams enabled."""
        headers, user_id, song_id = auth_headers
        
        response = client.get(
            f'/api/v1/songs/{song_id}/export/pdf?chord_diagrams=true',
            headers=headers
        )
        
        assert response.status_code == 200
        assert response.headers['Content-Type'] == 'application/pdf'
        assert response.data.startswith(b'%PDF')
        assert len(response.data) > 1000
    
    def test_pdf_export_with_chord_diagrams_disabled(self, client, auth_headers):
        """Test PDF export with chord diagrams explicitly disabled."""
        headers, user_id, song_id = auth_headers
        
        response = client.get(
            f'/api/v1/songs/{song_id}/export/pdf?chord_diagrams=false',
            headers=headers
        )
        
        assert response.status_code == 200
        assert response.headers['Content-Type'] == 'application/pdf'
        assert response.data.startswith(b'%PDF')
    
    def test_pdf_export_with_guitar_instrument(self, client, auth_headers):
        """Test PDF export with guitar chord diagrams."""
        headers, user_id, song_id = auth_headers
        
        response = client.get(
            f'/api/v1/songs/{song_id}/export/pdf?chord_diagrams=true&instrument=guitar',
            headers=headers
        )
        
        assert response.status_code == 200
        assert response.headers['Content-Type'] == 'application/pdf'
        assert response.data.startswith(b'%PDF')
    
    def test_pdf_export_with_ukulele_instrument(self, client, auth_headers):
        """Test PDF export with ukulele chord diagrams."""
        headers, user_id, song_id = auth_headers
        
        response = client.get(
            f'/api/v1/songs/{song_id}/export/pdf?chord_diagrams=true&instrument=ukulele',
            headers=headers
        )
        
        assert response.status_code == 200
        assert response.headers['Content-Type'] == 'application/pdf'
        assert response.data.startswith(b'%PDF')
    
    def test_pdf_export_with_all_parameters(self, client, auth_headers):
        """Test PDF export with all parameters including chord diagrams."""
        headers, user_id, song_id = auth_headers
        
        response = client.get(
            f'/api/v1/songs/{song_id}/export/pdf?'
            'paper_size=letter&orientation=landscape&template=modern&'
            'chord_diagrams=true&instrument=guitar&'
            'title=Custom Title&artist=Custom Artist',
            headers=headers
        )
        
        assert response.status_code == 200
        assert response.headers['Content-Type'] == 'application/pdf'
        assert response.data.startswith(b'%PDF')
        
        # Check filename includes custom title
        content_disposition = response.headers.get('Content-Disposition', '')
        assert 'Custom-Title' in content_disposition or 'Custom Title' in content_disposition
    
    def test_pdf_export_invalid_instrument(self, client, auth_headers):
        """Test PDF export with invalid instrument parameter."""
        headers, user_id, song_id = auth_headers
        
        response = client.get(
            f'/api/v1/songs/{song_id}/export/pdf?chord_diagrams=true&instrument=invalid',
            headers=headers
        )
        
        assert response.status_code == 400
        assert 'Invalid instrument' in response.get_json()['error']
    
    def test_pdf_export_chord_diagrams_with_templates(self, client, auth_headers):
        """Test PDF export with chord diagrams using different templates."""
        headers, user_id, song_id = auth_headers
        
        templates = ['classic', 'modern', 'minimal']
        
        for template in templates:
            response = client.get(
                f'/api/v1/songs/{song_id}/export/pdf?chord_diagrams=true&template={template}',
                headers=headers
            )
            
            assert response.status_code == 200
            assert response.headers['Content-Type'] == 'application/pdf'
            assert response.data.startswith(b'%PDF')
    
    def test_pdf_export_without_authentication(self, client, auth_headers):
        """Test PDF export without authentication fails."""
        _, user_id, song_id = auth_headers
        
        response = client.get(f'/api/v1/songs/{song_id}/export/pdf?chord_diagrams=true')
        
        assert response.status_code == 401
    
    def test_pdf_export_nonexistent_song(self, client, auth_headers):
        """Test PDF export for nonexistent song."""
        headers, user_id, song_id = auth_headers
        
        response = client.get(
            '/api/v1/songs/99999/export/pdf?chord_diagrams=true',
            headers=headers
        )
        
        assert response.status_code == 404


class TestPDFExportChordDiagramValidation:
    """Test parameter validation for chord diagram functionality."""
    
    def test_boolean_parameter_variations(self, client, auth_headers):
        """Test different boolean parameter formats for chord_diagrams."""
        headers, user_id, song_id = auth_headers
        
        # Test various true values
        true_values = ['true', 'True', 'TRUE', '1']
        for value in true_values:
            response = client.get(
                f'/api/v1/songs/{song_id}/export/pdf?chord_diagrams={value}',
                headers=headers
            )
            assert response.status_code == 200
        
        # Test various false values
        false_values = ['false', 'False', 'FALSE', '0', '']
        for value in false_values:
            response = client.get(
                f'/api/v1/songs/{song_id}/export/pdf?chord_diagrams={value}',
                headers=headers
            )
            assert response.status_code == 200
    
    def test_instrument_parameter_case_insensitive(self, client, auth_headers):
        """Test that instrument parameter is case insensitive."""
        headers, user_id, song_id = auth_headers
        
        instruments = ['guitar', 'Guitar', 'GUITAR', 'ukulele', 'Ukulele', 'UKULELE']
        
        for instrument in instruments:
            response = client.get(
                f'/api/v1/songs/{song_id}/export/pdf?chord_diagrams=true&instrument={instrument}',
                headers=headers
            )
            assert response.status_code == 200


class TestPDFExportChordDiagramContent:
    """Test PDF export with different chord content scenarios."""
    
    def test_pdf_export_with_complex_chords(self, app_instance, client, auth_headers):
        """Test PDF export with complex chord progressions."""
        headers, user_id, song_id = auth_headers
        
        with app_instance.app_context():
            # Create song with complex chords
            complex_song = Song(
                title='Complex Chords',
                content="""{title: Complex Chords}
{artist: Test Artist}

[Cmaj7]Complex [Dm7]chords [G7sus4]here
[Am7]Another [F#dim]line [Bb/C]with [Em7b5]fancy chords""",
                author_id=user_id
            )
            db.session.add(complex_song)
            db.session.commit()
            
            response = client.get(
                f'/api/v1/songs/{complex_song.id}/export/pdf?chord_diagrams=true',
                headers=headers
            )
            
            assert response.status_code == 200
            assert response.headers['Content-Type'] == 'application/pdf'
            assert response.data.startswith(b'%PDF')
    
    def test_pdf_export_with_no_chords(self, app_instance, client, auth_headers):
        """Test PDF export with content that has no chords."""
        headers, user_id, song_id = auth_headers
        
        with app_instance.app_context():
            # Create song without chords
            no_chord_song = Song(
                title='No Chords',
                content="""{title: No Chords}
{artist: Test Artist}

Just plain lyrics here
No chord markers at all
Simple song content""",
                author_id=user_id
            )
            db.session.add(no_chord_song)
            db.session.commit()
            
            response = client.get(
                f'/api/v1/songs/{no_chord_song.id}/export/pdf?chord_diagrams=true',
                headers=headers
            )
            
            assert response.status_code == 200
            assert response.headers['Content-Type'] == 'application/pdf'
            assert response.data.startswith(b'%PDF')
    
    def test_pdf_export_with_many_unique_chords(self, app_instance, client, auth_headers):
        """Test PDF export with many unique chords."""
        headers, user_id, song_id = auth_headers
        
        with app_instance.app_context():
            # Create song with many chords
            many_chords_content = """{title: Many Chords}
{artist: Test Artist}

[C]First [D]line [E]with [F]many [G]different [A]chords
[Am]Second [Dm]line [Em]with [Fm]more [Gm]chord [Bm]variations
[C7]Third [D7]line [E7]with [F7]seventh [G7]chords [A7]everywhere"""
            
            many_chord_song = Song(
                title='Many Chords',
                content=many_chords_content,
                author_id=user_id
            )
            db.session.add(many_chord_song)
            db.session.commit()
            
            response = client.get(
                f'/api/v1/songs/{many_chord_song.id}/export/pdf?chord_diagrams=true',
                headers=headers
            )
            
            assert response.status_code == 200
            assert response.headers['Content-Type'] == 'application/pdf'
            assert response.data.startswith(b'%PDF')
            # With many chords, the PDF should be larger
            assert len(response.data) > 2000


class TestPDFExportPerformance:
    """Test performance aspects of PDF export with chord diagrams."""
    
    def test_pdf_export_performance_comparison(self, client, auth_headers):
        """Test that chord diagram generation doesn't severely impact performance."""
        headers, user_id, song_id = auth_headers
        
        import time
        
        # Test without chord diagrams
        start_time = time.time()
        response1 = client.get(
            f'/api/v1/songs/{song_id}/export/pdf?chord_diagrams=false',
            headers=headers
        )
        time_without_diagrams = time.time() - start_time
        
        # Test with chord diagrams
        start_time = time.time()
        response2 = client.get(
            f'/api/v1/songs/{song_id}/export/pdf?chord_diagrams=true',
            headers=headers
        )
        time_with_diagrams = time.time() - start_time
        
        assert response1.status_code == 200
        assert response2.status_code == 200
        
        # Chord diagram generation shouldn't take more than 10x longer
        # (This is a very generous threshold for CI environments)
        assert time_with_diagrams < time_without_diagrams * 10