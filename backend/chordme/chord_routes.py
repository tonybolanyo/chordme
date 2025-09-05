"""
API routes for chord diagram management and lookup.
"""

import json
from flask import Blueprint, request, jsonify, current_app
from flasgger import swag_from
from .models import db, Chord
from .utils import auth_required
from datetime import datetime, UTC
import logging

logger = logging.getLogger(__name__)

def utc_now():
    """Helper function to get current UTC time."""
    return datetime.now(UTC)

# Create blueprint for chord routes
chord_bp = Blueprint('chords', __name__, url_prefix='/api/v1/chords')


@chord_bp.route('/', methods=['GET'])
@swag_from({
    'tags': ['Chords'],
    'summary': 'Get chord diagrams',
    'description': 'Retrieve chord diagrams with optional filtering by instrument, difficulty, and name',
    'parameters': [
        {
            'name': 'instrument',
            'in': 'query',
            'type': 'string',
            'enum': ['guitar', 'ukulele', 'mandolin'],
            'description': 'Filter by instrument type'
        },
        {
            'name': 'difficulty',
            'in': 'query',
            'type': 'string',
            'enum': ['beginner', 'intermediate', 'advanced', 'expert'],
            'description': 'Filter by difficulty level'
        },
        {
            'name': 'name',
            'in': 'query',
            'type': 'string',
            'description': 'Filter by chord name (partial match)'
        },
        {
            'name': 'max_fret',
            'in': 'query',
            'type': 'integer',
            'description': 'Filter by maximum fret position'
        },
        {
            'name': 'include_barre',
            'in': 'query',
            'type': 'boolean',
            'description': 'Include barre chords (default: true)'
        },
        {
            'name': 'language',
            'in': 'query',
            'type': 'string',
            'enum': ['en', 'es'],
            'description': 'Language for chord names (default: en)'
        },
        {
            'name': 'page',
            'in': 'query',
            'type': 'integer',
            'description': 'Page number for pagination (default: 1)'
        },
        {
            'name': 'limit',
            'in': 'query',
            'type': 'integer',
            'description': 'Number of chords per page (default: 50, max: 200)'
        }
    ],
    'responses': {
        200: {
            'description': 'List of chord diagrams',
            'schema': {
                'type': 'object',
                'properties': {
                    'chords': {
                        'type': 'array',
                        'items': {
                            'type': 'object',
                            'properties': {
                                'id': {'type': 'integer'},
                                'name': {'type': 'string'},
                                'definition': {'type': 'object'},
                                'description': {'type': 'string'},
                                'instrument': {'type': 'string'},
                                'difficulty': {'type': 'string'},
                                'spanish_name': {'type': 'string'}
                            }
                        }
                    },
                    'pagination': {
                        'type': 'object',
                        'properties': {
                            'page': {'type': 'integer'},
                            'limit': {'type': 'integer'},
                            'total': {'type': 'integer'},
                            'pages': {'type': 'integer'}
                        }
                    },
                    'statistics': {
                        'type': 'object',
                        'properties': {
                            'total_chords': {'type': 'integer'},
                            'by_instrument': {'type': 'object'},
                            'by_difficulty': {'type': 'object'}
                        }
                    }
                }
            }
        },
        400: {
            'description': 'Invalid query parameters'
        }
    }
})
def get_chords():
    """Get chord diagrams with filtering and pagination."""
    try:
        # Parse query parameters
        instrument = request.args.get('instrument')
        difficulty = request.args.get('difficulty')
        name = request.args.get('name')
        max_fret = request.args.get('max_fret', type=int)
        include_barre = request.args.get('include_barre', 'true').lower() == 'true'
        language = request.args.get('language', 'en')
        page = request.args.get('page', 1, type=int)
        limit = min(request.args.get('limit', 50, type=int), 200)

        # Build query
        query = Chord.query

        # Apply filters
        if name:
            # Search in chord name
            query = query.filter(Chord.name.ilike(f'%{name}%'))

        # Apply pagination
        paginated_chords = query.paginate(
            page=page,
            per_page=limit,
            error_out=False
        )

        # Process chord data and apply additional filters
        filtered_chords = []
        total_matched = 0

        for chord in paginated_chords.items:
            try:
                chord_data = json.loads(chord.definition)
                
                # Apply instrument filter
                if instrument and chord_data.get('instrument', {}).get('type') != instrument:
                    continue

                # Apply difficulty filter
                if difficulty and chord_data.get('difficulty') != difficulty:
                    continue

                # Apply max_fret filter
                if max_fret is not None:
                    positions = chord_data.get('positions', [])
                    max_chord_fret = max([pos.get('fret', 0) for pos in positions if pos.get('fret', 0) > 0], default=0)
                    if max_chord_fret > max_fret:
                        continue

                # Apply barre filter
                if not include_barre and chord_data.get('barre'):
                    continue

                # Prepare response data
                response_chord = {
                    'id': chord.id,
                    'name': chord.name,
                    'definition': chord_data,
                    'description': chord.description,
                    'instrument': chord_data.get('instrument', {}).get('type'),
                    'difficulty': chord_data.get('difficulty'),
                    'created_at': chord.created_at.isoformat() if chord.created_at else None,
                    'updated_at': chord.updated_at.isoformat() if chord.updated_at else None
                }

                # Add localized name based on language
                localization = chord_data.get('localization', {})
                names = localization.get('names', {})
                response_chord['display_name'] = names.get(language, chord.name)
                
                if language == 'es' and 'es' in names:
                    response_chord['spanish_name'] = names['es']

                filtered_chords.append(response_chord)
                total_matched += 1

            except (json.JSONDecodeError, KeyError) as e:
                logger.warning(f"Invalid chord data for chord {chord.id}: {str(e)}")
                continue

        # Calculate statistics
        all_chords = Chord.query.all()
        stats = {
            'total_chords': len(all_chords),
            'by_instrument': {},
            'by_difficulty': {}
        }

        for chord in all_chords:
            try:
                chord_data = json.loads(chord.definition)
                instrument_type = chord_data.get('instrument', {}).get('type', 'unknown')
                difficulty_level = chord_data.get('difficulty', 'unknown')
                
                stats['by_instrument'][instrument_type] = stats['by_instrument'].get(instrument_type, 0) + 1
                stats['by_difficulty'][difficulty_level] = stats['by_difficulty'].get(difficulty_level, 0) + 1
            except (json.JSONDecodeError, KeyError):
                continue

        response = {
            'chords': filtered_chords,
            'pagination': {
                'page': page,
                'limit': limit,
                'total': len(filtered_chords),
                'pages': (len(filtered_chords) + limit - 1) // limit
            },
            'statistics': stats
        }

        return jsonify(response), 200

    except Exception as e:
        logger.error(f"Error retrieving chords: {str(e)}")
        return jsonify({'error': 'Internal server error'}), 500


@chord_bp.route('/<int:chord_id>', methods=['GET'])
@swag_from({
    'tags': ['Chords'],
    'summary': 'Get specific chord diagram',
    'description': 'Retrieve a specific chord diagram by ID',
    'parameters': [
        {
            'name': 'chord_id',
            'in': 'path',
            'type': 'integer',
            'required': True,
            'description': 'Chord ID'
        },
        {
            'name': 'language',
            'in': 'query',
            'type': 'string',
            'enum': ['en', 'es'],
            'description': 'Language for localized content (default: en)'
        }
    ],
    'responses': {
        200: {
            'description': 'Chord diagram details',
            'schema': {
                'type': 'object',
                'properties': {
                    'id': {'type': 'integer'},
                    'name': {'type': 'string'},
                    'definition': {'type': 'object'},
                    'description': {'type': 'string'},
                    'instrument': {'type': 'string'},
                    'difficulty': {'type': 'string'},
                    'alternatives': {'type': 'array'},
                    'localization': {'type': 'object'}
                }
            }
        },
        404: {
            'description': 'Chord not found'
        }
    }
})
def get_chord(chord_id):
    """Get a specific chord diagram by ID."""
    try:
        language = request.args.get('language', 'en')
        
        chord = Chord.query.get(chord_id)
        if not chord:
            return jsonify({'error': 'Chord not found'}), 404

        chord_data = json.loads(chord.definition)
        
        # Prepare response with localized content
        localization = chord_data.get('localization', {})
        names = localization.get('names', {})
        descriptions = localization.get('descriptions', {})
        
        response = {
            'id': chord.id,
            'name': chord.name,
            'definition': chord_data,
            'description': descriptions.get(language, chord.description),
            'display_name': names.get(language, chord.name),
            'instrument': chord_data.get('instrument', {}).get('type'),
            'difficulty': chord_data.get('difficulty'),
            'alternatives': chord_data.get('alternatives', []),
            'localization': localization,
            'metadata': chord_data.get('metadata', {}),
            'created_at': chord.created_at.isoformat() if chord.created_at else None,
            'updated_at': chord.updated_at.isoformat() if chord.updated_at else None
        }

        return jsonify(response), 200

    except json.JSONDecodeError:
        logger.error(f"Invalid chord data for chord {chord_id}")
        return jsonify({'error': 'Invalid chord data'}), 500
    except Exception as e:
        logger.error(f"Error retrieving chord {chord_id}: {str(e)}")
        return jsonify({'error': 'Internal server error'}), 500


@chord_bp.route('/search', methods=['GET'])
@swag_from({
    'tags': ['Chords'],
    'summary': 'Search chord diagrams',
    'description': 'Search chord diagrams by name, including Spanish names',
    'parameters': [
        {
            'name': 'q',
            'in': 'query',
            'type': 'string',
            'required': True,
            'description': 'Search query (chord name or partial name)'
        },
        {
            'name': 'instrument',
            'in': 'query',
            'type': 'string',
            'enum': ['guitar', 'ukulele', 'mandolin'],
            'description': 'Filter by instrument type'
        },
        {
            'name': 'language',
            'in': 'query',
            'type': 'string',
            'enum': ['en', 'es'],
            'description': 'Search language (default: en)'
        },
        {
            'name': 'limit',
            'in': 'query',
            'type': 'integer',
            'description': 'Maximum number of results (default: 20, max: 100)'
        }
    ],
    'responses': {
        200: {
            'description': 'Search results',
            'schema': {
                'type': 'object',
                'properties': {
                    'results': {
                        'type': 'array',
                        'items': {
                            'type': 'object',
                            'properties': {
                                'id': {'type': 'integer'},
                                'name': {'type': 'string'},
                                'display_name': {'type': 'string'},
                                'instrument': {'type': 'string'},
                                'difficulty': {'type': 'string'},
                                'match_type': {'type': 'string'}
                            }
                        }
                    },
                    'query': {'type': 'string'},
                    'total_results': {'type': 'integer'}
                }
            }
        },
        400: {
            'description': 'Missing or invalid search query'
        }
    }
})
def search_chords():
    """Search chord diagrams by name."""
    try:
        query = request.args.get('q', '').strip()
        if not query:
            return jsonify({'error': 'Search query is required'}), 400

        instrument = request.args.get('instrument')
        language = request.args.get('language', 'en')
        limit = min(request.args.get('limit', 20, type=int), 100)

        # Search in chord names
        chords = Chord.query.filter(Chord.name.ilike(f'%{query}%')).all()

        results = []
        for chord in chords:
            try:
                chord_data = json.loads(chord.definition)
                
                # Apply instrument filter
                if instrument and chord_data.get('instrument', {}).get('type') != instrument:
                    continue

                # Check for matches in different languages
                localization = chord_data.get('localization', {})
                names = localization.get('names', {})
                
                match_type = 'exact'
                display_name = chord.name
                
                # Check English name match
                if query.lower() in chord.name.lower():
                    match_type = 'english_name'
                    display_name = names.get(language, chord.name)
                
                # Check Spanish name match if available
                spanish_name = names.get('es', '')
                if spanish_name and query.lower() in spanish_name.lower():
                    match_type = 'spanish_name'
                    display_name = spanish_name if language == 'es' else f"{chord.name} ({spanish_name})"

                result = {
                    'id': chord.id,
                    'name': chord.name,
                    'display_name': display_name,
                    'instrument': chord_data.get('instrument', {}).get('type'),
                    'difficulty': chord_data.get('difficulty'),
                    'match_type': match_type
                }
                
                if language == 'es' and 'es' in names:
                    result['spanish_name'] = names['es']

                results.append(result)

                if len(results) >= limit:
                    break

            except (json.JSONDecodeError, KeyError) as e:
                logger.warning(f"Invalid chord data for chord {chord.id}: {str(e)}")
                continue

        response = {
            'results': results,
            'query': query,
            'total_results': len(results)
        }

        return jsonify(response), 200

    except Exception as e:
        logger.error(f"Error searching chords: {str(e)}")
        return jsonify({'error': 'Internal server error'}), 500


@chord_bp.route('/instruments/<instrument_type>', methods=['GET'])
@swag_from({
    'tags': ['Chords'],
    'summary': 'Get chords for specific instrument',
    'description': 'Retrieve all chord diagrams for a specific instrument',
    'parameters': [
        {
            'name': 'instrument_type',
            'in': 'path',
            'type': 'string',
            'enum': ['guitar', 'ukulele', 'mandolin'],
            'required': True,
            'description': 'Instrument type'
        },
        {
            'name': 'difficulty',
            'in': 'query',
            'type': 'string',
            'enum': ['beginner', 'intermediate', 'advanced', 'expert'],
            'description': 'Filter by difficulty level'
        },
        {
            'name': 'chord_type',
            'in': 'query',
            'type': 'string',
            'enum': ['major', 'minor', 'seventh', 'suspended', 'diminished', 'augmented'],
            'description': 'Filter by chord type'
        }
    ],
    'responses': {
        200: {
            'description': 'Instrument-specific chord diagrams'
        },
        400: {
            'description': 'Invalid instrument type'
        }
    }
})
def get_chords_by_instrument(instrument_type):
    """Get chord diagrams for a specific instrument."""
    try:
        valid_instruments = ['guitar', 'ukulele', 'mandolin']
        if instrument_type not in valid_instruments:
            return jsonify({'error': f'Invalid instrument type. Must be one of: {valid_instruments}'}), 400

        difficulty = request.args.get('difficulty')
        chord_type = request.args.get('chord_type')

        # Get all chords and filter by instrument
        all_chords = Chord.query.all()
        filtered_chords = []

        for chord in all_chords:
            try:
                chord_data = json.loads(chord.definition)
                
                # Filter by instrument
                if chord_data.get('instrument', {}).get('type') != instrument_type:
                    continue

                # Filter by difficulty
                if difficulty and chord_data.get('difficulty') != difficulty:
                    continue

                # Filter by chord type (based on tags)
                if chord_type:
                    tags = chord_data.get('metadata', {}).get('tags', [])
                    if chord_type not in tags:
                        continue

                filtered_chords.append({
                    'id': chord.id,
                    'name': chord.name,
                    'definition': chord_data,
                    'difficulty': chord_data.get('difficulty'),
                    'instrument': instrument_type
                })

            except (json.JSONDecodeError, KeyError) as e:
                logger.warning(f"Invalid chord data for chord {chord.id}: {str(e)}")
                continue

        response = {
            'instrument': instrument_type,
            'chords': filtered_chords,
            'total_count': len(filtered_chords)
        }

        return jsonify(response), 200

    except Exception as e:
        logger.error(f"Error retrieving chords for instrument {instrument_type}: {str(e)}")
        return jsonify({'error': 'Internal server error'}), 500


@chord_bp.route('/custom', methods=['POST'])
@auth_required
@swag_from({
    'tags': ['Chords'],
    'summary': 'Create custom chord diagram',
    'description': 'Create a new custom chord diagram',
    'parameters': [
        {
            'name': 'body',
            'in': 'body',
            'required': True,
            'schema': {
                'type': 'object',
                'required': ['name', 'instrument', 'positions'],
                'properties': {
                    'name': {'type': 'string', 'description': 'Chord name'},
                    'instrument': {'type': 'string', 'enum': ['guitar', 'ukulele', 'mandolin']},
                    'positions': {
                        'type': 'array',
                        'items': {
                            'type': 'object',
                            'properties': {
                                'stringNumber': {'type': 'integer'},
                                'fret': {'type': 'integer'},
                                'finger': {'type': 'integer'}
                            }
                        }
                    },
                    'difficulty': {'type': 'string', 'enum': ['beginner', 'intermediate', 'advanced', 'expert']},
                    'description': {'type': 'string'}
                }
            }
        }
    ],
    'responses': {
        201: {
            'description': 'Custom chord created successfully'
        },
        400: {
            'description': 'Invalid chord data'
        }
    }
})
def create_custom_chord(current_user):
    """Create a custom chord diagram."""
    try:
        data = request.get_json()
        
        if not data:
            return jsonify({'error': 'JSON data is required'}), 400

        # Validate required fields
        required_fields = ['name', 'instrument', 'positions']
        for field in required_fields:
            if field not in data:
                return jsonify({'error': f'Missing required field: {field}'}), 400

        # Validate instrument type
        valid_instruments = ['guitar', 'ukulele', 'mandolin']
        if data['instrument'] not in valid_instruments:
            return jsonify({'error': f'Invalid instrument. Must be one of: {valid_instruments}'}), 400

        # Create chord diagram structure
        chord_diagram = {
            'id': f"custom_{data['instrument']}_{data['name'].lower()}_{int(datetime.now().timestamp())}",
            'name': data['name'],
            'instrument': {
                'type': data['instrument'],
                'stringCount': 4 if data['instrument'] == 'ukulele' else (6 if data['instrument'] == 'guitar' else 8)
            },
            'positions': data['positions'],
            'difficulty': data.get('difficulty', 'intermediate'),
            'alternatives': [],
            'notes': {'root': data['name'][0], 'notes': [], 'intervals': [], 'isStandardTuning': True},
            'localization': {
                'names': {'en': data['name']},
                'descriptions': {'en': data.get('description', f"Custom {data['name']} chord")},
                'fingeringInstructions': {'en': 'Custom fingering'}
            },
            'metadata': {
                'createdAt': utc_now().isoformat(),
                'updatedAt': utc_now().isoformat(),
                'source': 'user-created',
                'popularityScore': 0.5,
                'isVerified': False,
                'tags': [data['instrument'], 'custom']
            }
        }

        # Create chord record
        chord = Chord(
            name=data['name'],
            definition=json.dumps(chord_diagram),
            description=data.get('description', f"Custom {data['name']} chord"),
            user_id=current_user.id
        )

        db.session.add(chord)
        db.session.commit()

        response = {
            'id': chord.id,
            'name': chord.name,
            'definition': chord_diagram,
            'message': 'Custom chord created successfully'
        }

        return jsonify(response), 201

    except Exception as e:
        logger.error(f"Error creating custom chord: {str(e)}")
        db.session.rollback()
        return jsonify({'error': 'Internal server error'}), 500