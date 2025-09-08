"""
AI Music Insights API Routes

Provides RESTful endpoints for comprehensive music analysis including
chord progression analysis, structure detection, and learning recommendations.
"""

from flask import Blueprint, request, jsonify
from flasgger import swag_from
import traceback
from functools import wraps
from .ai_music_insights import ai_music_insights_service
from .utils import auth_required
from .error_codes import ErrorCode

# Create blueprint
ai_insights_bp = Blueprint('ai_insights', __name__, url_prefix='/api/v1/ai-insights')


def handle_request_errors(f):
    """Simple error handler decorator"""
    @wraps(f)
    def decorated_function(*args, **kwargs):
        try:
            return f(*args, **kwargs)
        except Exception as e:
            import logging
            logging.error(f"Request error in {f.__name__}: {str(e)}")
            logging.error(traceback.format_exc())
            return jsonify({
                'status': 'error',
                'error': ErrorCode.format_error(
                    ErrorCode.INTERNAL_SERVER_ERROR,
                    detail='An unexpected error occurred'
                )
            }), 500
    return decorated_function


@ai_insights_bp.route('/analyze', methods=['POST'])
@auth_required
@handle_request_errors
@swag_from({
    'tags': ['AI Music Insights'],
    'summary': 'Analyze song with AI-powered music insights',
    'description': '''
    Performs comprehensive music analysis including:
    - Chord progression analysis and pattern recognition
    - Song structure detection (verse, chorus, bridge identification)
    - Key and tempo analysis with confidence scoring
    - Musical complexity assessment
    - Genre classification based on chord patterns
    - Harmonic analysis and suggestions for improvements
    - Learning recommendations based on musical analysis
    ''',
    'parameters': [
        {
            'name': 'Authorization',
            'in': 'header',
            'type': 'string',
            'required': True,
            'description': 'Bearer token for authentication'
        },
        {
            'name': 'body',
            'in': 'body',
            'required': True,
            'schema': {
                'type': 'object',
                'properties': {
                    'content': {
                        'type': 'string',
                        'description': 'ChordPro content to analyze',
                        'example': '{title: Test Song}\n{artist: Test Artist}\n\n{start_of_verse}\n[C]This is a [F]test song\n{end_of_verse}'
                    },
                    'options': {
                        'type': 'object',
                        'description': 'Analysis options',
                        'properties': {
                            'enable_genre_classification': {
                                'type': 'boolean',
                                'default': True,
                                'description': 'Enable genre classification analysis'
                            },
                            'enable_harmonic_analysis': {
                                'type': 'boolean',
                                'default': True,
                                'description': 'Enable detailed harmonic analysis'
                            },
                            'enable_recommendations': {
                                'type': 'boolean',
                                'default': True,
                                'description': 'Enable learning recommendations'
                            },
                            'analysis_depth': {
                                'type': 'string',
                                'enum': ['basic', 'standard', 'comprehensive'],
                                'default': 'standard',
                                'description': 'Analysis depth level'
                            },
                            'user_skill_level': {
                                'type': 'string',
                                'enum': ['beginner', 'intermediate', 'advanced'],
                                'default': 'intermediate',
                                'description': 'User skill level for personalized recommendations'
                            }
                        }
                    }
                },
                'required': ['content']
            }
        }
    ],
    'responses': {
        200: {
            'description': 'Analysis completed successfully',
            'schema': {
                'type': 'object',
                'properties': {
                    'status': {'type': 'string', 'example': 'success'},
                    'data': {
                        'type': 'object',
                        'properties': {
                            'title': {'type': 'string', 'description': 'Song title'},
                            'artist': {'type': 'string', 'description': 'Song artist'},
                            'analyzed_at': {'type': 'string', 'format': 'date-time'},
                            'chord_progression': {
                                'type': 'array',
                                'items': {
                                    'type': 'object',
                                    'properties': {
                                        'name': {'type': 'string', 'example': 'I-V-vi-IV'},
                                        'pattern': {'type': 'string', 'example': '0-7-9-5'},
                                        'description': {'type': 'string', 'example': 'Popular pop progression'},
                                        'confidence': {'type': 'number', 'minimum': 0, 'maximum': 1},
                                        'key': {'type': 'string', 'example': 'C major'},
                                        'roman_numerals': {'type': 'array', 'items': {'type': 'string'}},
                                        'functional_labels': {'type': 'array', 'items': {'type': 'string'}}
                                    }
                                }
                            },
                            'structure': {
                                'type': 'object',
                                'properties': {
                                    'sections': {'type': 'array', 'items': {'type': 'object'}},
                                    'structure': {'type': 'string', 'example': 'V-C-V-C-B-C'},
                                    'confidence': {'type': 'number', 'minimum': 0, 'maximum': 1},
                                    'complexity_score': {'type': 'number', 'minimum': 0, 'maximum': 1},
                                    'estimated_duration': {'type': 'number', 'description': 'Estimated duration in seconds'}
                                }
                            },
                            'key': {
                                'type': 'object',
                                'properties': {
                                    'key': {'type': 'string', 'example': 'C major'},
                                    'root': {'type': 'string', 'example': 'C'},
                                    'mode': {'type': 'string', 'example': 'major'},
                                    'confidence': {'type': 'number', 'minimum': 0, 'maximum': 1},
                                    'alternatives': {'type': 'array', 'items': {'type': 'object'}},
                                    'signature': {'type': 'object'}
                                }
                            },
                            'complexity': {
                                'type': 'object',
                                'properties': {
                                    'overall_score': {'type': 'number', 'minimum': 0, 'maximum': 1},
                                    'chord_complexity': {'type': 'number', 'minimum': 0, 'maximum': 1},
                                    'harmonic_complexity': {'type': 'number', 'minimum': 0, 'maximum': 1},
                                    'rhythmic_complexity': {'type': 'number', 'minimum': 0, 'maximum': 1},
                                    'structure_complexity': {'type': 'number', 'minimum': 0, 'maximum': 1},
                                    'difficulty_level': {'type': 'string', 'enum': ['beginner', 'intermediate', 'advanced', 'expert']},
                                    'factors': {'type': 'array', 'items': {'type': 'object'}}
                                }
                            },
                            'genre': {
                                'type': 'object',
                                'properties': {
                                    'primary_genre': {'type': 'string', 'example': 'Pop'},
                                    'confidence': {'type': 'number', 'minimum': 0, 'maximum': 1},
                                    'alternative_genres': {'type': 'array', 'items': {'type': 'object'}},
                                    'characteristics': {'type': 'array', 'items': {'type': 'object'}}
                                }
                            },
                            'harmony': {
                                'type': 'object',
                                'properties': {
                                    'chord_functions': {'type': 'array', 'items': {'type': 'object'}},
                                    'cadences': {'type': 'array', 'items': {'type': 'object'}},
                                    'modulations': {'type': 'array', 'items': {'type': 'object'}},
                                    'harmonic_rhythm': {'type': 'object'},
                                    'suggestions': {'type': 'array', 'items': {'type': 'object'}}
                                }
                            },
                            'recommendations': {
                                'type': 'array',
                                'items': {
                                    'type': 'object',
                                    'properties': {
                                        'type': {'type': 'string', 'enum': ['technique', 'practice', 'theory', 'repertoire', 'performance']},
                                        'priority': {'type': 'string', 'enum': ['high', 'medium', 'low']},
                                        'title': {'type': 'string'},
                                        'description': {'type': 'string'},
                                        'estimated_time': {'type': 'string'},
                                        'difficulty': {'type': 'string', 'enum': ['beginner', 'intermediate', 'advanced']},
                                        'resources': {'type': 'array', 'items': {'type': 'object'}}
                                    }
                                }
                            },
                            'overall_confidence': {'type': 'number', 'minimum': 0, 'maximum': 1},
                            'analysis_metrics': {
                                'type': 'object',
                                'properties': {
                                    'processing_time': {'type': 'number', 'description': 'Processing time in seconds'},
                                    'algorithms_used': {'type': 'array', 'items': {'type': 'string'}},
                                    'data_quality': {'type': 'number', 'minimum': 0, 'maximum': 1}
                                }
                            }
                        }
                    }
                }
            }
        },
        400: {
            'description': 'Invalid request data',
            'schema': {'$ref': '#/definitions/ValidationError'}
        },
        401: {
            'description': 'Authentication required',
            'schema': {'$ref': '#/definitions/AuthenticationError'}
        },
        422: {
            'description': 'Analysis failed due to invalid content',
            'schema': {
                'type': 'object',
                'properties': {
                    'status': {'type': 'string', 'example': 'error'},
                    'error': {
                        'type': 'object',
                        'properties': {
                            'code': {'type': 'string', 'example': 'ANALYSIS_FAILED'},
                            'message': {'type': 'string', 'example': 'No chords detected in content'},
                            'category': {'type': 'string', 'example': 'validation'},
                            'retryable': {'type': 'boolean', 'example': False}
                        }
                    }
                }
            }
        },
        500: {
            'description': 'Internal server error',
            'schema': {'$ref': '#/definitions/ServerError'}
        }
    }
})
def analyze_song():
    """Analyze a song with AI-powered music insights"""
    data = request.get_json()
    
    if not data:
        return jsonify({
            'status': 'error',
            'error': ErrorCode.format_error(
                ErrorCode.MISSING_REQUIRED_FIELD,
                field='request body'
            )
        }), 400
    
    content = data.get('content')
    if not content:
        return jsonify({
            'status': 'error',
            'error': ErrorCode.format_error(
                ErrorCode.MISSING_REQUIRED_FIELD,
                field='content'
            )
        }), 400
    
    if not isinstance(content, str) or not content.strip():
        return jsonify({
            'status': 'error',
            'error': ErrorCode.format_error(
                ErrorCode.INVALID_INPUT_FORMAT,
                detail='Content must be a non-empty string'
            )
        }), 400
    
    options = data.get('options', {})
    
    try:
        # Perform analysis
        insights = ai_music_insights_service.analyze_song(content, options)
        
        return jsonify({
            'status': 'success',
            'data': insights
        }), 200
        
    except ValueError as e:
        # Analysis failed due to invalid content
        return jsonify({
            'status': 'error',
            'error': ErrorCode.format_error(
                ErrorCode.ANALYSIS_FAILED,
                detail=str(e)
            )
        }), 422
        
    except Exception as e:
        # Log the full error for debugging
        import logging
        logging.error(f"AI analysis error: {str(e)}")
        logging.error(traceback.format_exc())
        
        return jsonify({
            'status': 'error',
            'error': ErrorCode.format_error(
                ErrorCode.INTERNAL_SERVER_ERROR,
                detail='Music analysis service unavailable'
            )
        }), 500


@ai_insights_bp.route('/compare', methods=['POST'])
@auth_required
@handle_request_errors
@swag_from({
    'tags': ['AI Music Insights'],
    'summary': 'Compare two songs for similarity',
    'description': '''
    Compare two songs using AI analysis to determine similarity across multiple aspects:
    - Chord progression similarity
    - Song structure comparison
    - Key and genre matching
    - Musical complexity comparison
    - Common characteristics and differences
    ''',
    'parameters': [
        {
            'name': 'Authorization',
            'in': 'header',
            'type': 'string',
            'required': True,
            'description': 'Bearer token for authentication'
        },
        {
            'name': 'body',
            'in': 'body',
            'required': True,
            'schema': {
                'type': 'object',
                'properties': {
                    'song1_content': {
                        'type': 'string',
                        'description': 'ChordPro content of first song',
                        'example': '{title: Song 1}\n[C]First [G]song [Am]content [F]here'
                    },
                    'song2_content': {
                        'type': 'string',
                        'description': 'ChordPro content of second song',
                        'example': '{title: Song 2}\n[C]Second [G]song [Am]content [F]here'
                    },
                    'options': {
                        'type': 'object',
                        'description': 'Comparison options',
                        'properties': {
                            'analysis_depth': {
                                'type': 'string',
                                'enum': ['basic', 'standard', 'comprehensive'],
                                'default': 'standard',
                                'description': 'Analysis depth level'
                            }
                        }
                    }
                },
                'required': ['song1_content', 'song2_content']
            }
        }
    ],
    'responses': {
        200: {
            'description': 'Comparison completed successfully',
            'schema': {
                'type': 'object',
                'properties': {
                    'status': {'type': 'string', 'example': 'success'},
                    'data': {
                        'type': 'object',
                        'properties': {
                            'target_song': {'type': 'string', 'description': 'Title of second song'},
                            'similarity': {'type': 'number', 'minimum': 0, 'maximum': 1, 'description': 'Overall similarity score'},
                            'similarity_aspects': {
                                'type': 'array',
                                'items': {
                                    'type': 'object',
                                    'properties': {
                                        'aspect': {'type': 'string', 'enum': ['chord_progression', 'structure', 'key', 'tempo', 'genre', 'complexity']},
                                        'score': {'type': 'number', 'minimum': 0, 'maximum': 1},
                                        'weight': {'type': 'number', 'minimum': 0, 'maximum': 1}
                                    }
                                }
                            },
                            'common_characteristics': {
                                'type': 'array',
                                'items': {'type': 'string'},
                                'description': 'List of common characteristics between songs'
                            },
                            'differences': {
                                'type': 'array',
                                'items': {'type': 'string'},
                                'description': 'List of key differences between songs'
                            }
                        }
                    }
                }
            }
        },
        400: {
            'description': 'Invalid request data',
            'schema': {'$ref': '#/definitions/ValidationError'}
        },
        401: {
            'description': 'Authentication required',
            'schema': {'$ref': '#/definitions/AuthenticationError'}
        },
        422: {
            'description': 'Comparison failed due to invalid content',
            'schema': {'$ref': '#/definitions/ValidationError'}
        },
        500: {
            'description': 'Internal server error',
            'schema': {'$ref': '#/definitions/ServerError'}
        }
    }
})
def compare_songs():
    """Compare two songs for similarity using AI analysis"""
    data = request.get_json()
    
    if not data:
        return jsonify({
            'status': 'error',
            'error': ErrorCode.format_error(
                ErrorCode.MISSING_REQUIRED_FIELD,
                field='request body'
            )
        }), 400
    
    song1_content = data.get('song1_content')
    song2_content = data.get('song2_content')
    
    if not song1_content or not song2_content:
        missing_field = 'song1_content' if not song1_content else 'song2_content'
        return jsonify({
            'status': 'error',
            'error': ErrorCode.format_error(
                ErrorCode.MISSING_REQUIRED_FIELD,
                field=missing_field
            )
        }), 400
    
    if not isinstance(song1_content, str) or not isinstance(song2_content, str):
        return jsonify({
            'status': 'error',
            'error': ErrorCode.format_error(
                ErrorCode.INVALID_INPUT_FORMAT,
                detail='Song contents must be strings'
            )
        }), 400
    
    if not song1_content.strip() or not song2_content.strip():
        return jsonify({
            'status': 'error',
            'error': ErrorCode.format_error(
                ErrorCode.INVALID_INPUT_FORMAT,
                detail='Song contents cannot be empty'
            )
        }), 400
    
    options = data.get('options', {})
    
    try:
        # Perform comparison analysis
        similarity = ai_music_insights_service.compare_songs(song1_content, song2_content, options)
        
        return jsonify({
            'status': 'success',
            'data': similarity
        }), 200
        
    except ValueError as e:
        return jsonify({
            'status': 'error',
            'error': ErrorCode.format_error(
                ErrorCode.ANALYSIS_FAILED,
                detail=str(e)
            )
        }), 422
        
    except Exception as e:
        import logging
        logging.error(f"Song comparison error: {str(e)}")
        logging.error(traceback.format_exc())
        
        return jsonify({
            'status': 'error',
            'error': ErrorCode.format_error(
                ErrorCode.INTERNAL_SERVER_ERROR,
                detail='Song comparison service unavailable'
            )
        }), 500


@ai_insights_bp.route('/validate-content', methods=['POST'])
@auth_required
@handle_request_errors
@swag_from({
    'tags': ['AI Music Insights'],
    'summary': 'Validate ChordPro content for analysis',
    'description': '''
    Validate ChordPro content to check if it contains sufficient information
    for meaningful AI analysis. Returns validation results and recommendations
    for improving content quality.
    ''',
    'parameters': [
        {
            'name': 'Authorization',
            'in': 'header',
            'type': 'string',
            'required': True,
            'description': 'Bearer token for authentication'
        },
        {
            'name': 'body',
            'in': 'body',
            'required': True,
            'schema': {
                'type': 'object',
                'properties': {
                    'content': {
                        'type': 'string',
                        'description': 'ChordPro content to validate',
                        'example': '{title: Test Song}\n[C]Some [F]chords [G]here'
                    }
                },
                'required': ['content']
            }
        }
    ],
    'responses': {
        200: {
            'description': 'Validation completed',
            'schema': {
                'type': 'object',
                'properties': {
                    'status': {'type': 'string', 'example': 'success'},
                    'data': {
                        'type': 'object',
                        'properties': {
                            'is_valid': {'type': 'boolean', 'description': 'Whether content is suitable for analysis'},
                            'quality_score': {'type': 'number', 'minimum': 0, 'maximum': 1, 'description': 'Content quality score'},
                            'chord_count': {'type': 'integer', 'description': 'Number of chords detected'},
                            'unique_chords': {'type': 'integer', 'description': 'Number of unique chords'},
                            'has_structure': {'type': 'boolean', 'description': 'Whether song structure is defined'},
                            'has_metadata': {'type': 'boolean', 'description': 'Whether title/artist metadata is present'},
                            'recommendations': {
                                'type': 'array',
                                'items': {'type': 'string'},
                                'description': 'Recommendations to improve content quality'
                            },
                            'warnings': {
                                'type': 'array',
                                'items': {'type': 'string'},
                                'description': 'Potential issues with the content'
                            }
                        }
                    }
                }
            }
        },
        400: {
            'description': 'Invalid request data',
            'schema': {'$ref': '#/definitions/ValidationError'}
        },
        401: {
            'description': 'Authentication required',
            'schema': {'$ref': '#/definitions/AuthenticationError'}
        },
        500: {
            'description': 'Internal server error',
            'schema': {'$ref': '#/definitions/ServerError'}
        }
    }
})
def validate_content():
    """Validate ChordPro content for AI analysis"""
    data = request.get_json()
    
    if not data:
        return jsonify({
            'status': 'error',
            'error': ErrorCode.format_error(
                ErrorCode.MISSING_REQUIRED_FIELD,
                field='request body'
            )
        }), 400
    
    content = data.get('content')
    if not content:
        return jsonify({
            'status': 'error',
            'error': ErrorCode.format_error(
                ErrorCode.MISSING_REQUIRED_FIELD,
                field='content'
            )
        }), 400
    
    if not isinstance(content, str):
        return jsonify({
            'status': 'error',
            'error': ErrorCode.format_error(
                ErrorCode.INVALID_INPUT_FORMAT,
                detail='Content must be a string'
            )
        }), 400
    
    try:
        # Parse and validate content
        parsed = ai_music_insights_service.analyzer.parse_chordpro_content(content)
        
        # Calculate validation metrics
        chord_count = len(parsed['chords'])
        unique_chords = len(set(parsed['chords']))
        has_structure = len(parsed['sections']) > 0
        has_metadata = bool(parsed['title'] or parsed['artist'])
        
        # Calculate quality score
        quality_score = ai_music_insights_service._assess_data_quality(parsed)
        
        # Determine if content is valid for analysis
        is_valid = (
            chord_count >= 3 and
            unique_chords >= 2 and
            len(content.strip()) >= 50
        )
        
        # Generate recommendations
        recommendations = []
        warnings = []
        
        if chord_count < 4:
            recommendations.append("Add more chords to improve analysis accuracy")
            warnings.append(f"Only {chord_count} chords detected - analysis may be limited")
        
        if unique_chords < 3:
            recommendations.append("Use more varied chord progressions")
            warnings.append("Limited chord variety detected")
        
        if not has_structure:
            recommendations.append("Add section markers (verse, chorus, etc.) for better structure analysis")
        
        if not has_metadata:
            recommendations.append("Add title and artist metadata using {title:} and {artist:} directives")
        
        if len(content.strip()) < 100:
            recommendations.append("Provide more content for comprehensive analysis")
            warnings.append("Content is quite short")
        
        return jsonify({
            'status': 'success',
            'data': {
                'is_valid': is_valid,
                'quality_score': quality_score,
                'chord_count': chord_count,
                'unique_chords': unique_chords,
                'has_structure': has_structure,
                'has_metadata': has_metadata,
                'recommendations': recommendations,
                'warnings': warnings
            }
        }), 200
        
    except Exception as e:
        import logging
        logging.error(f"Content validation error: {str(e)}")
        
        return jsonify({
            'status': 'error',
            'error': ErrorCode.format_error(
                ErrorCode.INTERNAL_SERVER_ERROR,
                detail='Content validation service unavailable'
            )
        }), 500


@ai_insights_bp.route('/health', methods=['GET'])
@swag_from({
    'tags': ['AI Music Insights'],
    'summary': 'Check AI insights service health',
    'description': 'Check the health and availability of the AI music insights service',
    'responses': {
        200: {
            'description': 'Service is healthy',
            'schema': {
                'type': 'object',
                'properties': {
                    'status': {'type': 'string', 'example': 'success'},
                    'data': {
                        'type': 'object',
                        'properties': {
                            'service': {'type': 'string', 'example': 'AI Music Insights'},
                            'status': {'type': 'string', 'example': 'healthy'},
                            'version': {'type': 'string', 'example': '1.0.0'},
                            'features': {
                                'type': 'array',
                                'items': {'type': 'string'},
                                'example': ['chord_progression_analysis', 'structure_detection', 'genre_classification']
                            }
                        }
                    }
                }
            }
        },
        500: {
            'description': 'Service is unhealthy',
            'schema': {'$ref': '#/definitions/ServerError'}
        }
    }
})
def health_check():
    """Check the health of the AI insights service"""
    try:
        # Test basic functionality
        test_content = "{title: Health Check}\n[C]Test [F]content [G]here"
        parsed = ai_music_insights_service.analyzer.parse_chordpro_content(test_content)
        
        if not parsed['chords']:
            raise Exception("Chord parsing failed")
        
        return jsonify({
            'status': 'success',
            'data': {
                'service': 'AI Music Insights',
                'status': 'healthy',
                'version': '1.0.0',
                'features': [
                    'chord_progression_analysis',
                    'structure_detection',
                    'key_analysis',
                    'complexity_assessment',
                    'genre_classification',
                    'harmonic_analysis',
                    'learning_recommendations',
                    'song_similarity_comparison'
                ]
            }
        }), 200
        
    except Exception as e:
        import logging
        logging.error(f"AI insights health check failed: {str(e)}")
        
        return jsonify({
            'status': 'error',
            'error': ErrorCode.format_error(
                ErrorCode.INTERNAL_SERVER_ERROR,
                detail='AI insights service unhealthy'
            )
        }), 500


# Register error handlers
@ai_insights_bp.errorhandler(400)
def handle_bad_request(error):
    """Handle bad request errors"""
    return jsonify({
        'status': 'error',
        'error': ErrorCode.format_error(
            ErrorCode.INVALID_INPUT_FORMAT,
            detail='Bad request'
        )
    }), 400


@ai_insights_bp.errorhandler(404)
def handle_not_found(error):
    """Handle not found errors"""
    return jsonify({
        'status': 'error',
        'error': ErrorCode.format_error(
            ErrorCode.RESOURCE_NOT_FOUND,
            detail='Endpoint not found'
        )
    }), 404


@ai_insights_bp.errorhandler(405)
def handle_method_not_allowed(error):
    """Handle method not allowed errors"""
    return jsonify({
        'status': 'error',
        'error': ErrorCode.format_error(
            ErrorCode.INVALID_INPUT_FORMAT,
            detail='Method not allowed'
        )
    }), 405


@ai_insights_bp.errorhandler(500)
def handle_internal_error(error):
    """Handle internal server errors"""
    return jsonify({
        'status': 'error',
        'error': ErrorCode.format_error(
            ErrorCode.INTERNAL_SERVER_ERROR,
            detail='Internal server error'
        )
    }), 500