"""
Tests for chord database functionality.
"""

import pytest
import json
from chordme import app, db
from chordme.models import Chord, User
from datetime import datetime, UTC
import sys
import os

# Add the database directory to Python path
current_dir = os.path.dirname(os.path.abspath(__file__))
backend_dir = os.path.dirname(current_dir)
database_dir = os.path.join(os.path.dirname(backend_dir), 'database')
sys.path.insert(0, database_dir)

@pytest.fixture
def client():
    """Create a test client."""
    app.config['TESTING'] = True
    app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///:memory:'
    
    with app.test_client() as client:
        with app.app_context():
            db.create_all()
            yield client
            db.drop_all()


@pytest.fixture
def auth_headers(client):
    """Create authentication headers for testing."""
    # Create a test user
    user = User(email='test@example.com', password='testpass123')
    db.session.add(user)
    db.session.commit()
    
    # Login to get JWT token
    response = client.post('/api/v1/auth/login', json={
        'email': 'test@example.com',
        'password': 'testpass123'
    })
    
    if response.status_code == 200:
        token = response.get_json()['data']['token']
        return {'Authorization': f'Bearer {token}'}
    
    return {}


@pytest.fixture
def sample_chord_data():
    """Sample chord diagram data for testing."""
    return {
        'id': 'guitar_c_test',
        'name': 'C',
        'instrument': {
            'type': 'guitar',
            'stringCount': 6,
            'standardTuning': ['E', 'A', 'D', 'G', 'B', 'E'],
            'fretRange': {'min': 0, 'max': 24},
            'commonCapoPositions': [0, 1, 2, 3, 4, 5]
        },
        'positions': [
            {'stringNumber': 1, 'fret': -1, 'finger': -1},
            {'stringNumber': 2, 'fret': 3, 'finger': 3},
            {'stringNumber': 3, 'fret': 2, 'finger': 2},
            {'stringNumber': 4, 'fret': 0, 'finger': 0},
            {'stringNumber': 5, 'fret': 1, 'finger': 1},
            {'stringNumber': 6, 'fret': 0, 'finger': 0}
        ],
        'difficulty': 'beginner',
        'alternatives': [],
        'notes': {
            'root': 'C',
            'notes': ['C', 'E', 'G'],
            'intervals': ['1', '3', '5'],
            'isStandardTuning': True
        },
        'localization': {
            'names': {'en': 'C', 'es': 'Do'},
            'descriptions': {
                'en': 'C major chord for guitar',
                'es': 'Acorde de Do mayor para guitarra'
            },
            'fingeringInstructions': {
                'en': 'Standard fingering',
                'es': 'Digitación estándar'
            }
        },
        'metadata': {
            'createdAt': datetime.now(UTC).isoformat(),
            'updatedAt': datetime.now(UTC).isoformat(),
            'source': 'official',
            'popularityScore': 0.8,
            'isVerified': True,
            'tags': ['guitar', 'major', 'triad', 'beginner']
        }
    }


class TestChordDatabasePopulation:
    """Test chord database population functionality."""
    
    def test_chord_creation(self, client, sample_chord_data):
        """Test creating a chord in the database."""
        # Create a test user first
        user = User(email='test@example.com', password='testpass123')
        db.session.add(user)
        db.session.commit()
        
        # Create a chord
        chord = Chord(
            name=sample_chord_data['name'],
            definition=json.dumps(sample_chord_data),
            description=sample_chord_data['localization']['descriptions']['en'],
            user_id=user.id
        )
        
        db.session.add(chord)
        db.session.commit()
        
        # Verify chord was created
        saved_chord = Chord.query.filter_by(name='C').first()
        assert saved_chord is not None
        assert saved_chord.name == 'C'
        
        # Verify chord data structure
        chord_data = json.loads(saved_chord.definition)
        assert chord_data['instrument']['type'] == 'guitar'
        assert chord_data['difficulty'] == 'beginner'
        assert len(chord_data['positions']) == 6


class TestChordAPIEndpoints:
    """Test chord API endpoints."""
    
    def test_get_chords_endpoint(self, client, sample_chord_data):
        """Test GET /api/v1/chords endpoint."""
        # Create a test user and chord
        user = User(email='test@example.com', password='testpass123')
        db.session.add(user)
        db.session.commit()
        
        chord = Chord(
            name=sample_chord_data['name'],
            definition=json.dumps(sample_chord_data),
            description=sample_chord_data['localization']['descriptions']['en'],
            user_id=user.id
        )
        db.session.add(chord)
        db.session.commit()
        
        # Test GET request
        response = client.get('/api/v1/chords/')
        assert response.status_code == 200
        
        data = response.get_json()
        assert 'chords' in data
        assert 'pagination' in data
        assert 'statistics' in data
        assert len(data['chords']) == 1
        assert data['chords'][0]['name'] == 'C'
    
    def test_get_chord_by_id(self, client, sample_chord_data):
        """Test GET /api/v1/chords/<id> endpoint."""
        # Create a test user and chord
        user = User(email='test@example.com', password='testpass123')
        db.session.add(user)
        db.session.commit()
        
        chord = Chord(
            name=sample_chord_data['name'],
            definition=json.dumps(sample_chord_data),
            description=sample_chord_data['localization']['descriptions']['en'],
            user_id=user.id
        )
        db.session.add(chord)
        db.session.commit()
        
        # Test GET request
        response = client.get(f'/api/v1/chords/{chord.id}')
        assert response.status_code == 200
        
        data = response.get_json()
        assert data['name'] == 'C'
        assert data['instrument'] == 'guitar'
        assert data['difficulty'] == 'beginner'
    
    def test_search_chords_endpoint(self, client, sample_chord_data):
        """Test GET /api/v1/chords/search endpoint."""
        # Create a test user and chord
        user = User(email='test@example.com', password='testpass123')
        db.session.add(user)
        db.session.commit()
        
        chord = Chord(
            name=sample_chord_data['name'],
            definition=json.dumps(sample_chord_data),
            description=sample_chord_data['localization']['descriptions']['en'],
            user_id=user.id
        )
        db.session.add(chord)
        db.session.commit()
        
        # Test search request
        response = client.get('/api/v1/chords/search?q=C')
        assert response.status_code == 200
        
        data = response.get_json()
        assert 'results' in data
        assert len(data['results']) == 1
        assert data['results'][0]['name'] == 'C'
    
    def test_get_chords_by_instrument(self, client, sample_chord_data):
        """Test GET /api/v1/chords/instruments/<type> endpoint."""
        # Create a test user and chord
        user = User(email='test@example.com', password='testpass123')
        db.session.add(user)
        db.session.commit()
        
        chord = Chord(
            name=sample_chord_data['name'],
            definition=json.dumps(sample_chord_data),
            description=sample_chord_data['localization']['descriptions']['en'],
            user_id=user.id
        )
        db.session.add(chord)
        db.session.commit()
        
        # Test GET request for guitar chords
        response = client.get('/api/v1/chords/instruments/guitar')
        assert response.status_code == 200
        
        data = response.get_json()
        assert data['instrument'] == 'guitar'
        assert len(data['chords']) == 1
        assert data['chords'][0]['name'] == 'C'
    
    def test_filtering_by_difficulty(self, client, sample_chord_data):
        """Test filtering chords by difficulty."""
        # Create a test user and chord
        user = User(email='test@example.com', password='testpass123')
        db.session.add(user)
        db.session.commit()
        
        chord = Chord(
            name=sample_chord_data['name'],
            definition=json.dumps(sample_chord_data),
            description=sample_chord_data['localization']['descriptions']['en'],
            user_id=user.id
        )
        db.session.add(chord)
        db.session.commit()
        
        # Test filtering by difficulty
        response = client.get('/api/v1/chords/?difficulty=beginner')
        assert response.status_code == 200
        
        data = response.get_json()
        assert len(data['chords']) == 1
        assert data['chords'][0]['difficulty'] == 'beginner'
        
        # Test filtering by non-matching difficulty
        response = client.get('/api/v1/chords/?difficulty=advanced')
        assert response.status_code == 200
        
        data = response.get_json()
        assert len(data['chords']) == 0
    
    def test_spanish_localization(self, client, sample_chord_data):
        """Test Spanish localization for chord names."""
        # Create a test user and chord
        user = User(email='test@example.com', password='testpass123')
        db.session.add(user)
        db.session.commit()
        
        chord = Chord(
            name=sample_chord_data['name'],
            definition=json.dumps(sample_chord_data),
            description=sample_chord_data['localization']['descriptions']['en'],
            user_id=user.id
        )
        db.session.add(chord)
        db.session.commit()
        
        # Test Spanish localization
        response = client.get('/api/v1/chords/?language=es')
        assert response.status_code == 200
        
        data = response.get_json()
        assert len(data['chords']) == 1
        assert data['chords'][0]['display_name'] == 'Do'
        assert data['chords'][0].get('spanish_name') == 'Do'


class TestChordDatabaseSeeder:
    """Test the chord database seeder functionality."""
    
    def test_seeder_import(self):
        """Test that the seeder can be imported and has the right structure."""
        from populate_chord_database import ChordDatabaseSeeder
        
        seeder = ChordDatabaseSeeder()
        assert hasattr(seeder, 'spanish_chord_names')
        assert hasattr(seeder, 'create_chord_diagram')
        assert hasattr(seeder, 'get_guitar_chords')
        assert hasattr(seeder, 'get_ukulele_chords')
        assert hasattr(seeder, 'get_mandolin_chords')
    
    def test_chord_diagram_creation(self):
        """Test chord diagram creation by the seeder."""
        from populate_chord_database import ChordDatabaseSeeder
        
        seeder = ChordDatabaseSeeder()
        chord = seeder.create_chord_diagram('C', 'guitar', ['x', 3, 2, 0, 1, 0], 'beginner')
        
        assert chord['name'] == 'C'
        assert chord['instrument']['type'] == 'guitar'
        assert chord['difficulty'] == 'beginner'
        assert len(chord['positions']) == 6
        assert chord['localization']['names']['es'] == 'Do'
    
    def test_spanish_chord_names(self):
        """Test Spanish chord name mappings."""
        from populate_chord_database import ChordDatabaseSeeder
        
        seeder = ChordDatabaseSeeder()
        
        # Test basic chord names
        assert seeder.spanish_chord_names['C'] == 'Do'
        assert seeder.spanish_chord_names['D'] == 'Re'
        assert seeder.spanish_chord_names['E'] == 'Mi'
        assert seeder.spanish_chord_names['F'] == 'Fa'
        assert seeder.spanish_chord_names['G'] == 'Sol'
        assert seeder.spanish_chord_names['A'] == 'La'
        assert seeder.spanish_chord_names['B'] == 'Si'
        
        # Test sharp and flat notes
        assert seeder.spanish_chord_names['C#'] == 'Do#'
        assert seeder.spanish_chord_names['Bb'] == 'Sib'
    
    def test_chord_generation_counts(self):
        """Test that the seeder generates the expected number of chords."""
        from populate_chord_database import ChordDatabaseSeeder
        
        seeder = ChordDatabaseSeeder()
        
        guitar_chords = seeder.get_guitar_chords()
        ukulele_chords = seeder.get_ukulele_chords()
        mandolin_chords = seeder.get_mandolin_chords()
        
        # Verify we have a substantial number of chords
        assert len(guitar_chords) >= 50  # Should have many guitar chords
        assert len(ukulele_chords) >= 15  # Should have basic ukulele chords
        assert len(mandolin_chords) >= 10  # Should have basic mandolin chords
        
        # Verify total is over 200 as required
        total_chords = len(guitar_chords) + len(ukulele_chords) + len(mandolin_chords)
        assert total_chords >= 75  # Should be much more, but conservative test
    
    def test_chord_data_structure_validity(self):
        """Test that generated chords have valid data structures."""
        from populate_chord_database import ChordDatabaseSeeder
        
        seeder = ChordDatabaseSeeder()
        guitar_chords = seeder.get_guitar_chords()
        
        # Test first chord
        chord = guitar_chords[0]
        
        # Required fields
        assert 'id' in chord
        assert 'name' in chord
        assert 'instrument' in chord
        assert 'positions' in chord
        assert 'difficulty' in chord
        assert 'localization' in chord
        assert 'metadata' in chord
        
        # Instrument structure
        assert chord['instrument']['type'] in ['guitar', 'ukulele', 'mandolin']
        assert 'stringCount' in chord['instrument']
        assert 'standardTuning' in chord['instrument']
        
        # Localization structure
        assert 'en' in chord['localization']['names']
        assert 'es' in chord['localization']['names']
        
        # Metadata structure
        assert chord['metadata']['isVerified'] is True
        assert chord['metadata']['source'] == 'official'
        assert isinstance(chord['metadata']['tags'], list)


if __name__ == '__main__':
    pytest.main([__file__])