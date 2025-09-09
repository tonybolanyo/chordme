"""
Enhanced Full-Text Search Routes
Provides advanced search functionality for songs with:
- Boolean operators (AND, OR, NOT)
- Phrase searching with quotes
- Search suggestions and autocomplete
- Result highlighting and ranking
- Performance optimization with caching
"""

from flask import Blueprint, request, jsonify, g
from flasgger import swag_from
import time
import re
import json
from datetime import datetime, timedelta
from sqlalchemy import text
from . import db
from .utils import auth_required, validate_request_size, sanitize_input
from .rate_limiter import rate_limit
from .security_headers import security_headers
import logging

# Create search blueprint
search_bp = Blueprint('search', __name__)

# Simple in-memory cache for search results (in production, use Redis)
search_cache = {}
CACHE_TTL = 300  # 5 minutes

def get_cached_result(cache_key):
    """Get cached search result if not expired"""
    if cache_key in search_cache:
        result, timestamp = search_cache[cache_key]
        if time.time() - timestamp < CACHE_TTL:
            return result
        else:
            del search_cache[cache_key]
    return None

def cache_result(cache_key, result):
    """Cache search result with timestamp"""
    search_cache[cache_key] = (result, time.time())
    
    # Simple cache cleanup - remove old entries
    if len(search_cache) > 1000:  # Limit cache size
        current_time = time.time()
        expired_keys = [k for k, (_, ts) in search_cache.items() if current_time - ts > CACHE_TTL]
        for k in expired_keys:
            del search_cache[k]

def parse_search_query(query):
    """Parse search query to identify special operators and syntax"""
    if not query:
        return {
            'original': '',
            'phrases': [],
            'and_terms': [],
            'or_terms': [],
            'not_terms': [],
            'has_operators': False
        }
    
    result = {
        'original': query,
        'phrases': [],
        'and_terms': [],
        'or_terms': [],
        'not_terms': [],
        'has_operators': False
    }
    
    # Extract quoted phrases
    phrases = re.findall(r'"([^"]+)"', query)
    result['phrases'] = phrases
    
    # Remove phrases from query for further parsing
    clean_query = re.sub(r'"[^"]+"', '', query)
    
    # Split into terms
    terms = clean_query.split()
    
    current_terms = []
    i = 0
    while i < len(terms):
        term = terms[i].strip()
        
        if term.upper() == 'AND':
            result['has_operators'] = True
            i += 1
            continue
        elif term.upper() == 'OR':
            result['has_operators'] = True
            if current_terms:
                result['or_terms'].extend(current_terms)
                current_terms = []
            i += 1
            continue
        elif term.upper() == 'NOT' and i + 1 < len(terms):
            result['has_operators'] = True
            result['not_terms'].append(terms[i + 1])
            i += 2
            continue
        elif term.startswith('-'):
            result['has_operators'] = True
            result['not_terms'].append(term[1:])
        elif term.startswith('+'):
            current_terms.append(term[1:])
        else:
            current_terms.append(term)
        
        i += 1
    
    # Add remaining terms as AND terms
    result['and_terms'].extend(current_terms)
    
    return result

def highlight_text(text, query_terms, max_length=200):
    """Highlight search terms in text with context"""
    if not text or not query_terms:
        return text[:max_length] + ('...' if len(text) > max_length else '')
    
    # Create case-insensitive pattern for all terms
    pattern_terms = []
    for term in query_terms:
        if term and len(term) > 1:
            escaped_term = re.escape(term)
            pattern_terms.append(escaped_term)
    
    if not pattern_terms:
        return text[:max_length] + ('...' if len(text) > max_length else '')
    
    pattern = r'(' + '|'.join(pattern_terms) + ')'
    
    # Find first match to determine context
    match = re.search(pattern, text, re.IGNORECASE)
    if match:
        start_pos = max(0, match.start() - 50)
        end_pos = min(len(text), match.start() + max_length - 50)
        context_text = text[start_pos:end_pos]
        
        # Add ellipsis if text is truncated
        if start_pos > 0:
            context_text = '...' + context_text
        if end_pos < len(text):
            context_text = context_text + '...'
    else:
        context_text = text[:max_length] + ('...' if len(text) > max_length else '')
    
    # Highlight matches
    highlighted = re.sub(pattern, r'<mark>\1</mark>', context_text, flags=re.IGNORECASE)
    
    return highlighted

@search_bp.route('/api/v1/songs/search', methods=['GET'])
@auth_required
@rate_limit(max_requests=100, window_seconds=300)  # 100 searches per 5 minutes
@security_headers
@swag_from({
    'tags': ['Search'],
    'summary': 'Advanced song search with full-text capabilities',
    'description': '''
    Search songs with advanced features:
    - Boolean operators: AND, OR, NOT (e.g., "love AND peace NOT war")
    - Phrase search: Use quotes for exact phrases (e.g., "amazing grace")
    - Field-specific search with fuzzy matching
    - Result ranking and highlighting
    - Performance-optimized with caching
    ''',
    'parameters': [
        {
            'name': 'q',
            'in': 'query',
            'type': 'string',
            'description': 'Search query with optional boolean operators and phrases'
        },
        {
            'name': 'genre',
            'in': 'query',
            'type': 'string',
            'description': 'Filter by genre'
        },
        {
            'name': 'key',
            'in': 'query',
            'type': 'string',
            'description': 'Filter by song key (e.g., C, G, Am)'
        },
        {
            'name': 'difficulty',
            'in': 'query',
            'type': 'string',
            'enum': ['beginner', 'intermediate', 'advanced', 'expert'],
            'description': 'Filter by difficulty level'
        },
        {
            'name': 'language',
            'in': 'query',
            'type': 'string',
            'description': 'Filter by language (default: en)'
        },
        {
            'name': 'tags',
            'in': 'query',
            'type': 'array',
            'items': {'type': 'string'},
            'description': 'Filter by tags (comma-separated)'
        },
        {
            'name': 'min_tempo',
            'in': 'query',
            'type': 'integer',
            'description': 'Minimum tempo (BPM)'
        },
        {
            'name': 'max_tempo',
            'in': 'query',
            'type': 'integer',
            'description': 'Maximum tempo (BPM)'
        },
        {
            'name': 'include_public',
            'in': 'query',
            'type': 'boolean',
            'default': True,
            'description': 'Include public songs in results'
        },
        {
            'name': 'limit',
            'in': 'query',
            'type': 'integer',
            'default': 20,
            'maximum': 100,
            'description': 'Maximum number of results'
        },
        {
            'name': 'offset',
            'in': 'query',
            'type': 'integer',
            'default': 0,
            'description': 'Results offset for pagination'
        },
        {
            'name': 'enable_cache',
            'in': 'query',
            'type': 'boolean',
            'default': True,
            'description': 'Enable result caching for performance'
        }
    ],
    'responses': {
        200: {
            'description': 'Search results with metadata',
            'schema': {
                'type': 'object',
                'properties': {
                    'results': {
                        'type': 'array',
                        'items': {
                            'type': 'object',
                            'properties': {
                                'id': {'type': 'string', 'format': 'uuid'},
                                'title': {'type': 'string'},
                                'artist': {'type': 'string'},
                                'genre': {'type': 'string'},
                                'song_key': {'type': 'string'},
                                'tempo': {'type': 'integer'},
                                'difficulty': {'type': 'string'},
                                'language': {'type': 'string'},
                                'view_count': {'type': 'integer'},
                                'favorite_count': {'type': 'integer'},
                                'created_at': {'type': 'string', 'format': 'date-time'},
                                'relevance_score': {'type': 'number'},
                                'match_type': {'type': 'string'},
                                'matched_fields': {'type': 'array', 'items': {'type': 'string'}},
                                'highlights': {
                                    'type': 'object',
                                    'properties': {
                                        'title': {'type': 'string'},
                                        'artist': {'type': 'string'},
                                        'lyrics': {'type': 'string'}
                                    }
                                }
                            }
                        }
                    },
                    'total_count': {'type': 'integer'},
                    'search_time_ms': {'type': 'integer'},
                    'query_info': {
                        'type': 'object',
                        'properties': {
                            'original_query': {'type': 'string'},
                            'parsed_query': {'type': 'object'},
                            'filters_applied': {'type': 'object'}
                        }
                    },
                    'suggestions': {
                        'type': 'array',
                        'items': {'type': 'string'}
                    }
                }
            }
        },
        400: {'description': 'Invalid search parameters'},
        429: {'description': 'Rate limit exceeded'}
    }
})
def search_songs():
    """Advanced full-text search for songs"""
    start_time = time.time()
    
    try:
        # Get search parameters
        query = sanitize_input(request.args.get('q', '').strip())
        genre = sanitize_input(request.args.get('genre', ''))
        song_key = sanitize_input(request.args.get('key', ''))
        difficulty = sanitize_input(request.args.get('difficulty', ''))
        language = sanitize_input(request.args.get('language', 'en'))
        time_signature = sanitize_input(request.args.get('time_signature', ''))
        tags_param = request.args.get('tags', '')
        categories_param = request.args.get('categories', '')
        min_tempo = request.args.get('min_tempo', type=int)
        max_tempo = request.args.get('max_tempo', type=int)
        include_public = request.args.get('include_public', 'true').lower() == 'true'
        limit = min(request.args.get('limit', 20, type=int), 100)
        offset = max(request.args.get('offset', 0, type=int), 0)
        enable_cache = request.args.get('enable_cache', 'true').lower() == 'true'
        
        # Date range parameters
        date_from_str = request.args.get('date_from', '')
        date_to_str = request.args.get('date_to', '')
        date_field = request.args.get('date_field', 'created_at')  # 'created_at' or 'updated_at'
        
        # Parse tags and categories
        tags = [tag.strip() for tag in tags_param.split(',') if tag.strip()] if tags_param else None
        categories = [cat.strip() for cat in categories_param.split(',') if cat.strip()] if categories_param else None
        
        # Parse date range
        date_from = None
        date_to = None
        if date_from_str:
            try:
                date_from = datetime.fromisoformat(date_from_str.replace('Z', '+00:00'))
            except ValueError:
                return jsonify({'error': 'Invalid date_from format. Use ISO 8601.'}), 400
        
        if date_to_str:
            try:
                date_to = datetime.fromisoformat(date_to_str.replace('Z', '+00:00'))
            except ValueError:
                return jsonify({'error': 'Invalid date_to format. Use ISO 8601.'}), 400
        
        # Validate parameters
        if min_tempo is not None and (min_tempo < 0 or min_tempo > 300):
            return jsonify({'error': 'Invalid min_tempo value'}), 400
        if max_tempo is not None and (max_tempo < 0 or max_tempo > 300):
            return jsonify({'error': 'Invalid max_tempo value'}), 400
        if difficulty and difficulty not in ['beginner', 'intermediate', 'advanced', 'expert']:
            return jsonify({'error': 'Invalid difficulty level'}), 400
        if date_field not in ['created_at', 'updated_at']:
            return jsonify({'error': 'Invalid date_field. Must be created_at or updated_at'}), 400
            
        # Create cache key for this search
        cache_key = None
        if enable_cache:
            cache_params = {
                'query': query,
                'genre': genre,
                'song_key': song_key,
                'difficulty': difficulty,
                'language': language,
                'time_signature': time_signature,
                'tags': tags,
                'categories': categories,
                'min_tempo': min_tempo,
                'max_tempo': max_tempo,
                'date_from': date_from_str,
                'date_to': date_to_str,
                'date_field': date_field,
                'include_public': include_public,
                'limit': limit,
                'offset': offset,
                'user_id': str(g.current_user_id)
            }
            cache_key = str(hash(json.dumps(cache_params, sort_keys=True)))
            
            # Try to get cached result
            cached_result = get_cached_result(cache_key)
            if cached_result:
                return jsonify(cached_result), 200
        
        # Parse search query
        parsed_query = parse_search_query(query)
        
        # Use Song model's enhanced search method
        from .models import Song
        search_query = Song.search(
            query=query if query else None,
            genre=genre if genre else None,
            song_key=song_key if song_key else None,
            difficulty=difficulty if difficulty else None,
            language=language,
            tags=tags,
            categories=categories,
            min_tempo=min_tempo,
            max_tempo=max_tempo,
            time_signature=time_signature if time_signature else None,
            user_id=g.current_user_id,
            include_public=include_public,
            date_from=date_from,
            date_to=date_to,
            date_field=date_field,
            limit=limit,
            offset=offset
        )
        
        search_results_raw = search_query.all()
        
        # Get total count for pagination (run without limit/offset)
        count_query = Song.search(
            query=query if query else None,
            genre=genre if genre else None,
            song_key=song_key if song_key else None,
            difficulty=difficulty if difficulty else None,
            language=language,
            tags=tags,
            categories=categories,
            min_tempo=min_tempo,
            max_tempo=max_tempo,
            time_signature=time_signature if time_signature else None,
            user_id=g.current_user_id,
            include_public=include_public,
            date_from=date_from,
            date_to=date_to,
            date_field=date_field,
            limit=None,
            offset=None
        )
        total_count = count_query.count()
        
        # Process results and add highlighting
        processed_results = []
        search_terms = []
        
        if query:
            search_terms.extend(parsed_query['phrases'])
            search_terms.extend(parsed_query['and_terms'])
            search_terms.extend(parsed_query['or_terms'])
        
        for song in search_results_raw:
            result = {
                'id': str(song.id),
                'title': song.title,
                'artist': song.artist,
                'genre': song.genre,
                'song_key': song.song_key,
                'tempo': song.tempo,
                'time_signature': song.time_signature,
                'difficulty': song.difficulty,
                'language': song.language,
                'view_count': song.view_count or 0,
                'favorite_count': song.favorite_count or 0,
                'created_at': song.created_at.isoformat() if song.created_at else None,
                'updated_at': song.updated_at.isoformat() if song.updated_at else None,
                'relevance_score': 1.0,  # Basic relevance for now
                'match_type': 'query_match',
                'matched_fields': ['title', 'artist', 'content']  # Basic match fields
            }
            
            # Add highlights if search terms exist
            if search_terms:
                highlights = {}
                
                if song.title:
                    highlights['title'] = highlight_text(song.title, search_terms, 100)
                if song.artist:
                    highlights['artist'] = highlight_text(song.artist, search_terms, 100) 
                if song.lyrics:
                    highlights['lyrics'] = highlight_text(song.lyrics, search_terms, 200)
                
                result['highlights'] = highlights
            
            processed_results.append(result)
        
        # Calculate search time
        search_time_ms = int((time.time() - start_time) * 1000)
        
        # Prepare response
        response_data = {
            'results': processed_results,
            'total_count': total_count,
            'search_time_ms': search_time_ms,
            'query_info': {
                'original_query': query,
                'parsed_query': parsed_query,
                'filters_applied': {
                    'genre': genre,
                    'key': song_key,
                    'difficulty': difficulty,
                    'language': language,
                    'tags': tags,
                    'tempo_range': [min_tempo, max_tempo] if min_tempo or max_tempo else None
                }
            }
        }
        
        # Add search suggestions if query is provided but results are limited (PostgreSQL only)
        if query and len(processed_results) < 5:
            # Check if we're using PostgreSQL (has the get_search_suggestions function)
            try:
                # Only try suggestions on PostgreSQL
                if 'postgresql' in str(db.engine.url).lower():
                    suggestions_sql = text('''
                        SELECT suggestion, type, count FROM get_search_suggestions(
                            :partial_query, 'all', 5, :user_id_filter
                        )
                    ''')
                    suggestions_result = db.session.execute(suggestions_sql, {
                        'partial_query': query,
                        'user_id_filter': g.current_user_id
                    }).fetchall()
                    
                    response_data['suggestions'] = [row.suggestion for row in suggestions_result]
                else:
                    # For SQLite or other databases, provide basic suggestions
                    response_data['suggestions'] = []
            except Exception:
                # If suggestions fail, continue without them
                response_data['suggestions'] = []
        
        # Cache the result if caching is enabled
        if enable_cache and cache_key:
            cache_result(cache_key, response_data)
        
        # Log search analytics (PostgreSQL only)
        try:
            # Only log analytics on PostgreSQL
            if 'postgresql' in str(db.engine.url).lower():
                analytics_sql = text('''
                    SELECT log_search_analytics(
                        :query, :user_id, :results_count, :search_time,
                        :filters, :ip_address, :user_agent
                    )
                ''')
                
                filters_json = json.dumps(response_data['query_info']['filters_applied'])
                
                db.session.execute(analytics_sql, {
                    'query': query or '',
                    'user_id': g.current_user_id,
                    'results_count': total_count,
                    'search_time': search_time_ms,
                    'filters': filters_json,
                    'ip_address': request.remote_addr,
                    'user_agent': request.headers.get('User-Agent', '')[:500]
                })
                db.session.commit()
        except Exception as analytics_error:
            # Don't fail the search if analytics logging fails
            db.session.rollback()
            print(f"Analytics logging failed: {analytics_error}")
        
        return jsonify(response_data), 200
        
    except Exception as e:
        # Log security event for potential attack
        logger = logging.getLogger(__name__)
        logger.warning(f"Search error for user {getattr(g, 'current_user_id', None)}: {str(e)}", 
                      extra={'ip_address': request.remote_addr})
        
        return jsonify({
            'error': 'Search failed',
            'message': 'An error occurred while searching. Please try again.'
        }), 500

@search_bp.route('/api/v1/songs/suggestions', methods=['GET'])
@auth_required
@rate_limit(max_requests=200, window_seconds=300)  # 200 suggestions per 5 minutes
@security_headers
@swag_from({
    'tags': ['Search'],
    'summary': 'Get search suggestions and autocomplete',
    'description': 'Get suggestions for song titles, artists, and tags based on partial input',
    'parameters': [
        {
            'name': 'q',
            'in': 'query',
            'type': 'string',
            'required': True,
            'description': 'Partial search query for suggestions'
        },
        {
            'name': 'type',
            'in': 'query',
            'type': 'string',
            'enum': ['title', 'artist', 'tag', 'all'],
            'default': 'all',
            'description': 'Type of suggestions to return'
        },
        {
            'name': 'limit',
            'in': 'query',
            'type': 'integer',
            'default': 10,
            'maximum': 20,
            'description': 'Maximum number of suggestions'
        }
    ],
    'responses': {
        200: {
            'description': 'Search suggestions',
            'schema': {
                'type': 'object',
                'properties': {
                    'suggestions': {
                        'type': 'array',
                        'items': {
                            'type': 'object',
                            'properties': {
                                'text': {'type': 'string'},
                                'type': {'type': 'string'},
                                'count': {'type': 'integer'},
                                'relevance_score': {'type': 'number'}
                            }
                        }
                    },
                    'query': {'type': 'string'}
                }
            }
        },
        400: {'description': 'Invalid parameters'},
        429: {'description': 'Rate limit exceeded'}
    }
})
def get_suggestions():
    """Get search suggestions and autocomplete"""
    try:
        query = sanitize_input(request.args.get('q', '').strip())
        suggestion_type = sanitize_input(request.args.get('type', 'all'))
        limit = min(request.args.get('limit', 10, type=int), 20)
        
        if not query:
            return jsonify({'error': 'Query parameter q is required'}), 400
        
        if len(query) < 2:
            return jsonify({'suggestions': [], 'query': query}), 200
        
        if suggestion_type not in ['title', 'artist', 'tag', 'all']:
            return jsonify({'error': 'Invalid suggestion type'}), 400
        
        # Get suggestions from database
        suggestions_sql = text('''
            SELECT suggestion, type, count, relevance_score 
            FROM get_search_suggestions(:partial_query, :suggestion_type, :max_suggestions, :user_id_filter)
            ORDER BY relevance_score DESC, count DESC
        ''')
        
        results = db.session.execute(suggestions_sql, {
            'partial_query': query,
            'suggestion_type': suggestion_type,
            'max_suggestions': limit,
            'user_id_filter': g.current_user_id
        }).fetchall()
        
        suggestions = []
        for row in results:
            suggestions.append({
                'text': row.suggestion,
                'type': row.type,
                'count': row.count,
                'relevance_score': float(row.relevance_score)
            })
        
        return jsonify({
            'suggestions': suggestions,
            'query': query
        }), 200
        
    except Exception as e:
        logger = logging.getLogger(__name__)
        logger.warning(f"Suggestions error for user {getattr(g, 'current_user_id', None)}: {str(e)}", 
                      extra={'ip_address': request.remote_addr})
        
        return jsonify({
            'error': 'Failed to get suggestions',
            'message': 'An error occurred while getting suggestions.'
        }), 500