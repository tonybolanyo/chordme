"""
Forum routes for community discussion system.
Handles categories, threads, posts, voting, reputation, and moderation.
"""

from . import app, db
from .models import (ForumCategory, ForumThread, ForumPost, ForumVote, 
                    UserReputation, UserBadge, ForumModeration, User)
from .utils import (auth_required, create_error_response, create_success_response, 
                   validate_request_size, sanitize_input, sanitize_html_content)
from .rate_limiter import rate_limit
from .security_headers import security_headers
from flask import request, jsonify, g
from sqlalchemy.exc import IntegrityError
from sqlalchemy import or_, and_, func, desc
from datetime import datetime, timedelta
import re


# Forum Categories

@app.route('/api/v1/forum/categories', methods=['GET'])
@security_headers
def get_forum_categories():
    """
    Get all forum categories.
    ---
    tags:
      - Forum
    summary: Get forum categories
    description: Retrieve all forum categories with basic statistics
    parameters:
      - in: query
        name: parent_id
        type: integer
        description: Filter by parent category (for subcategories)
      - in: query
        name: include_stats
        type: boolean
        default: true
        description: Include thread/post counts
    responses:
      200:
        description: Categories retrieved successfully
        schema:
          type: object
          properties:
            status:
              type: string
              example: success
            data:
              type: array
              items:
                type: object
    """
    try:
        parent_id = request.args.get('parent_id', type=int)
        include_stats = request.args.get('include_stats', 'true').lower() == 'true'
        
        query = ForumCategory.query
        if parent_id is not None:
            query = query.filter_by(parent_id=parent_id)
        else:
            # Default to top-level categories only
            query = query.filter_by(parent_id=None)
        
        categories = query.filter_by(is_public=True).order_by(ForumCategory.display_order).all()
        
        return create_success_response({
            'categories': [cat.to_dict(include_stats=include_stats) for cat in categories]
        })
        
    except Exception as e:
        return create_error_response(f"Failed to retrieve categories: {str(e)}", 500)


@app.route('/api/v1/forum/categories', methods=['POST'])
@rate_limit("3 per hour")
@security_headers
@validate_request_size(max_content_length=1024*10)  # 10KB limit
@auth_required
def create_forum_category():
    """
    Create a new forum category (admin only).
    ---
    tags:
      - Forum
    summary: Create forum category
    description: Create a new forum category (requires admin privileges)
    parameters:
      - in: body
        name: category_data
        schema:
          type: object
          required:
            - name
            - slug
          properties:
            name:
              type: string
              description: Category name
            slug:
              type: string
              description: URL slug for category
            description:
              type: string
              description: Category description
            parent_id:
              type: integer
              description: Parent category ID (for subcategories)
            color:
              type: string
              description: Hex color code
            icon:
              type: string
              description: Icon class or emoji
    responses:
      201:
        description: Category created successfully
      403:
        description: Admin privileges required
    """
    try:
        # TODO: Add admin role check
        # For now, allow any authenticated user to create categories
        
        data = request.get_json()
        if not data:
            return create_error_response("No data provided", 400)
        
        name = sanitize_input(data.get('name', '').strip())
        slug = sanitize_input(data.get('slug', '').strip())
        description = sanitize_input(data.get('description', ''))
        
        if not name or not slug:
            return create_error_response("Name and slug are required", 400)
        
        # Validate slug format
        if not re.match(r'^[a-z0-9-]+$', slug):
            return create_error_response("Slug must contain only lowercase letters, numbers, and hyphens", 400)
        
        # Check if slug already exists
        existing = ForumCategory.query.filter_by(slug=slug).first()
        if existing:
            return create_error_response("A category with this slug already exists", 400)
        
        category = ForumCategory(
            name=name,
            slug=slug,
            description=description,
            parent_id=data.get('parent_id'),
            color=data.get('color', '#3498db')
        )
        
        if 'icon' in data:
            category.icon = sanitize_input(data['icon'])
        
        db.session.add(category)
        db.session.commit()
        
        return create_success_response({
            'category': category.to_dict()
        }, 201)
        
    except IntegrityError:
        db.session.rollback()
        return create_error_response("Category with this slug already exists", 400)
    except Exception as e:
        db.session.rollback()
        return create_error_response(f"Failed to create category: {str(e)}", 500)


# Forum Threads

@app.route('/api/v1/forum/categories/<slug>/threads', methods=['GET'])
@security_headers
def get_category_threads(slug):
    """
    Get threads in a specific category.
    ---
    tags:
      - Forum
    summary: Get category threads
    description: Retrieve threads in a specific forum category
    parameters:
      - in: path
        name: slug
        type: string
        required: true
        description: Category slug
      - in: query
        name: sort
        type: string
        enum: [recent, popular, oldest]
        default: recent
        description: Sort order
      - in: query
        name: thread_type
        type: string
        enum: [discussion, question, announcement, feature_request]
        description: Filter by thread type
      - in: query
        name: page
        type: integer
        default: 1
        description: Page number
      - in: query
        name: limit
        type: integer
        default: 20
        description: Threads per page
    responses:
      200:
        description: Threads retrieved successfully
      404:
        description: Category not found
    """
    try:
        category = ForumCategory.query.filter_by(slug=slug).first()
        if not category:
            return create_error_response("Category not found", 404)
        
        page = max(1, request.args.get('page', 1, type=int))
        limit = min(50, max(1, request.args.get('limit', 20, type=int)))
        sort_by = request.args.get('sort', 'recent')
        thread_type = request.args.get('thread_type')
        
        query = ForumThread.query.filter_by(
            category_id=category.id,
            is_deleted=False,
            is_approved=True
        )
        
        if thread_type:
            query = query.filter_by(thread_type=thread_type)
        
        # Apply sorting
        if sort_by == 'popular':
            query = query.order_by(desc(ForumThread.vote_score), desc(ForumThread.last_activity_at))
        elif sort_by == 'oldest':
            query = query.order_by(ForumThread.created_at)
        else:  # recent
            query = query.order_by(desc(ForumThread.is_pinned), desc(ForumThread.last_activity_at))
        
        # Paginate
        total = query.count()
        threads = query.offset((page - 1) * limit).limit(limit).all()
        
        return create_success_response({
            'threads': [thread.to_dict(include_author=True) for thread in threads],
            'pagination': {
                'page': page,
                'limit': limit,
                'total': total,
                'pages': (total + limit - 1) // limit
            },
            'category': category.to_dict(include_stats=False)
        })
        
    except Exception as e:
        return create_error_response(f"Failed to retrieve threads: {str(e)}", 500)


@app.route('/api/v1/forum/threads', methods=['POST'])
@rate_limit("5 per hour")
@security_headers
@validate_request_size(max_content_length=1024*50)  # 50KB limit
@auth_required
def create_forum_thread():
    """
    Create a new forum thread.
    ---
    tags:
      - Forum
    summary: Create forum thread
    description: Create a new discussion thread in a forum category
    parameters:
      - in: body
        name: thread_data
        schema:
          type: object
          required:
            - title
            - content
            - category_id
          properties:
            title:
              type: string
              description: Thread title
            content:
              type: string
              description: Thread content (first post)
            category_id:
              type: integer
              description: Forum category ID
            thread_type:
              type: string
              enum: [discussion, question, announcement, feature_request]
              default: discussion
              description: Type of thread
            tags:
              type: array
              items:
                type: string
              description: Thread tags
    responses:
      201:
        description: Thread created successfully
      400:
        description: Invalid data provided
    """
    try:
        data = request.get_json()
        if not data:
            return create_error_response("No data provided", 400)
        
        title = sanitize_input(data.get('title', '').strip())
        content = sanitize_input(data.get('content', '').strip())
        category_id = data.get('category_id')
        
        if not title or not content or not category_id:
            return create_error_response("Title, content, and category_id are required", 400)
        
        if len(title) > 255:
            return create_error_response("Title too long (max 255 characters)", 400)
        
        # Verify category exists and is accessible
        category = ForumCategory.query.filter_by(id=category_id, is_public=True).first()
        if not category:
            return create_error_response("Category not found or not accessible", 404)
        
        # Check user reputation requirements
        user_reputation = UserReputation.query.filter_by(user_id=g.current_user.id).first()
        if not user_reputation:
            # Create initial reputation for new user
            user_reputation = UserReputation(user_id=g.current_user.id)
            db.session.add(user_reputation)
        
        if user_reputation.total_score < category.required_reputation:
            return create_error_response(
                f"Insufficient reputation. Required: {category.required_reputation}, "
                f"Current: {user_reputation.total_score}", 403
            )
        
        thread = ForumThread(
            title=title,
            content=content,
            author_id=g.current_user.id,
            category_id=category_id,
            thread_type=data.get('thread_type', 'discussion'),
            tags=data.get('tags', [])
        )
        
        # Sanitize HTML content
        thread.content = sanitize_html_content(content)
        
        db.session.add(thread)
        db.session.flush()  # Get thread ID
        
        # Create initial post
        initial_post = ForumPost(
            content=thread.content,
            author_id=g.current_user.id,
            thread_id=thread.id
        )
        initial_post.content_html = sanitize_html_content(content)
        
        db.session.add(initial_post)
        
        # Update category statistics
        category.thread_count += 1
        category.post_count += 1
        category.last_activity_at = datetime.utcnow()
        
        # Update user reputation
        user_reputation.threads_created += 1
        user_reputation.add_score(5, 'thread')  # 5 points for creating thread
        
        db.session.commit()
        
        return create_success_response({
            'thread': thread.to_dict(include_content=True, include_author=True)
        }, 201)
        
    except Exception as e:
        db.session.rollback()
        return create_error_response(f"Failed to create thread: {str(e)}", 500)


@app.route('/api/v1/forum/threads/<int:thread_id>', methods=['GET'])
@security_headers
def get_forum_thread(thread_id):
    """
    Get a specific forum thread with posts.
    ---
    tags:
      - Forum
    summary: Get forum thread
    description: Retrieve a specific thread with its posts
    parameters:
      - in: path
        name: thread_id
        type: integer
        required: true
        description: Thread ID
      - in: query
        name: page
        type: integer
        default: 1
        description: Page number for posts
      - in: query
        name: limit
        type: integer
        default: 20
        description: Posts per page
    responses:
      200:
        description: Thread retrieved successfully
      404:
        description: Thread not found
    """
    try:
        thread = ForumThread.query.filter_by(
            id=thread_id,
            is_deleted=False,
            is_approved=True
        ).first()
        
        if not thread:
            return create_error_response("Thread not found", 404)
        
        # Increment view count
        thread.view_count += 1
        
        page = max(1, request.args.get('page', 1, type=int))
        limit = min(50, max(1, request.args.get('limit', 20, type=int)))
        
        # Get posts for this thread
        posts_query = ForumPost.query.filter_by(
            thread_id=thread_id,
            is_deleted=False,
            is_approved=True
        ).order_by(ForumPost.created_at)
        
        total_posts = posts_query.count()
        posts = posts_query.offset((page - 1) * limit).limit(limit).all()
        
        db.session.commit()  # Commit view count increment
        
        return create_success_response({
            'thread': thread.to_dict(include_content=True, include_author=True),
            'posts': [post.to_dict(include_author=True) for post in posts],
            'pagination': {
                'page': page,
                'limit': limit,
                'total': total_posts,
                'pages': (total_posts + limit - 1) // limit
            }
        })
        
    except Exception as e:
        db.session.rollback()
        return create_error_response(f"Failed to retrieve thread: {str(e)}", 500)


# Forum Posts

@app.route('/api/v1/forum/threads/<int:thread_id>/posts', methods=['POST'])
@rate_limit("10 per hour")
@security_headers
@validate_request_size(max_content_length=1024*20)  # 20KB limit
@auth_required
def create_forum_post(thread_id):
    """
    Create a new post in a forum thread.
    ---
    tags:
      - Forum
    summary: Create forum post
    description: Add a new post to an existing thread
    parameters:
      - in: path
        name: thread_id
        type: integer
        required: true
        description: Thread ID
      - in: body
        name: post_data
        schema:
          type: object
          required:
            - content
          properties:
            content:
              type: string
              description: Post content
            parent_post_id:
              type: integer
              description: Parent post ID (for replies)
    responses:
      201:
        description: Post created successfully
      400:
        description: Invalid data provided
      404:
        description: Thread not found
    """
    try:
        # Verify thread exists and is not locked
        thread = ForumThread.query.filter_by(
            id=thread_id,
            is_deleted=False,
            is_approved=True,
            is_locked=False
        ).first()
        
        if not thread:
            return create_error_response("Thread not found or locked", 404)
        
        data = request.get_json()
        if not data:
            return create_error_response("No data provided", 400)
        
        content = sanitize_input(data.get('content', '').strip())
        if not content:
            return create_error_response("Content is required", 400)
        
        parent_post_id = data.get('parent_post_id')
        if parent_post_id:
            # Verify parent post exists in the same thread
            parent_post = ForumPost.query.filter_by(
                id=parent_post_id,
                thread_id=thread_id,
                is_deleted=False
            ).first()
            if not parent_post:
                return create_error_response("Parent post not found", 404)
        
        post = ForumPost(
            content=content,
            author_id=g.current_user.id,
            thread_id=thread_id,
            parent_post_id=parent_post_id
        )
        
        # Sanitize HTML content
        post.content_html = sanitize_html_content(content)
        
        db.session.add(post)
        db.session.flush()  # Get post ID
        
        # Update thread statistics
        thread.post_count += 1
        thread.update_activity(post.id)
        
        # Update category statistics
        category = thread.category
        category.post_count += 1
        category.last_activity_at = datetime.utcnow()
        
        # Update user reputation
        user_reputation = UserReputation.query.filter_by(user_id=g.current_user.id).first()
        if not user_reputation:
            user_reputation = UserReputation(user_id=g.current_user.id)
            db.session.add(user_reputation)
        
        user_reputation.posts_created += 1
        user_reputation.add_score(2, 'post')  # 2 points for creating post
        
        db.session.commit()
        
        return create_success_response({
            'post': post.to_dict(include_author=True)
        }, 201)
        
    except Exception as e:
        db.session.rollback()
        return create_error_response(f"Failed to create post: {str(e)}", 500)


# Voting System

@app.route('/api/v1/forum/threads/<int:thread_id>/vote', methods=['POST'])
@rate_limit("20 per minute")
@security_headers
@auth_required
def vote_on_thread(thread_id):
    """
    Vote on a forum thread.
    ---
    tags:
      - Forum
    summary: Vote on thread
    description: Cast a vote (upvote/downvote) on a forum thread
    parameters:
      - in: path
        name: thread_id
        type: integer
        required: true
        description: Thread ID
      - in: body
        name: vote_data
        schema:
          type: object
          required:
            - vote_type
          properties:
            vote_type:
              type: string
              enum: [upvote, downvote]
              description: Type of vote
    responses:
      200:
        description: Vote cast successfully
      400:
        description: Invalid vote type
      404:
        description: Thread not found
    """
    try:
        thread = ForumThread.query.filter_by(
            id=thread_id,
            is_deleted=False,
            is_approved=True
        ).first()
        
        if not thread:
            return create_error_response("Thread not found", 404)
        
        data = request.get_json()
        if not data:
            return create_error_response("No data provided", 400)
        
        vote_type = data.get('vote_type')
        if vote_type not in ['upvote', 'downvote']:
            return create_error_response("Invalid vote type", 400)
        
        # Check for existing vote
        existing_vote = ForumVote.query.filter_by(
            user_id=g.current_user.id,
            thread_id=thread_id
        ).first()
        
        if existing_vote:
            if existing_vote.vote_type == vote_type:
                # Remove vote (toggle off)
                db.session.delete(existing_vote)
                vote_delta = -1 if vote_type == 'upvote' else 1
            else:
                # Change vote
                old_vote_type = existing_vote.vote_type
                existing_vote.vote_type = vote_type
                existing_vote.updated_at = datetime.utcnow()
                vote_delta = 2 if vote_type == 'upvote' else -2
        else:
            # New vote
            new_vote = ForumVote(
                user_id=g.current_user.id,
                vote_type=vote_type,
                thread_id=thread_id
            )
            db.session.add(new_vote)
            vote_delta = 1 if vote_type == 'upvote' else -1
        
        # Update thread score
        thread.vote_score += vote_delta
        
        # Update author reputation
        author_reputation = UserReputation.query.filter_by(user_id=thread.author_id).first()
        if author_reputation:
            rep_points = 10 if vote_type == 'upvote' else -5
            author_reputation.add_score(rep_points, 'thread')
        
        db.session.commit()
        
        return create_success_response({
            'vote_score': thread.vote_score,
            'user_vote': vote_type if not (existing_vote and existing_vote.vote_type == vote_type) else None
        })
        
    except Exception as e:
        db.session.rollback()
        return create_error_response(f"Failed to vote on thread: {str(e)}", 500)


@app.route('/api/v1/forum/posts/<int:post_id>/vote', methods=['POST'])
@rate_limit("20 per minute")
@security_headers
@auth_required
def vote_on_post(post_id):
    """
    Vote on a forum post.
    ---
    tags:
      - Forum
    summary: Vote on post
    description: Cast a vote (upvote/downvote/helpful) on a forum post
    parameters:
      - in: path
        name: post_id
        type: integer
        required: true
        description: Post ID
      - in: body
        name: vote_data
        schema:
          type: object
          required:
            - vote_type
          properties:
            vote_type:
              type: string
              enum: [upvote, downvote, helpful]
              description: Type of vote
    responses:
      200:
        description: Vote cast successfully
      400:
        description: Invalid vote type
      404:
        description: Post not found
    """
    try:
        post = ForumPost.query.filter_by(
            id=post_id,
            is_deleted=False,
            is_approved=True
        ).first()
        
        if not post:
            return create_error_response("Post not found", 404)
        
        data = request.get_json()
        if not data:
            return create_error_response("No data provided", 400)
        
        vote_type = data.get('vote_type')
        if vote_type not in ['upvote', 'downvote', 'helpful']:
            return create_error_response("Invalid vote type", 400)
        
        # Check for existing vote
        existing_vote = ForumVote.query.filter_by(
            user_id=g.current_user.id,
            post_id=post_id
        ).first()
        
        if existing_vote:
            if existing_vote.vote_type == vote_type:
                # Remove vote (toggle off)
                db.session.delete(existing_vote)
                if vote_type == 'helpful':
                    post.helpful_count = max(0, post.helpful_count - 1)
                else:
                    vote_delta = -1 if vote_type == 'upvote' else 1
                    post.vote_score += vote_delta
            else:
                # Change vote
                old_vote_type = existing_vote.vote_type
                existing_vote.vote_type = vote_type
                existing_vote.updated_at = datetime.utcnow()
                
                # Update counters
                if old_vote_type == 'helpful':
                    post.helpful_count = max(0, post.helpful_count - 1)
                else:
                    vote_delta = 1 if old_vote_type == 'upvote' else -1
                    post.vote_score -= vote_delta
                
                if vote_type == 'helpful':
                    post.helpful_count += 1
                else:
                    vote_delta = 1 if vote_type == 'upvote' else -1
                    post.vote_score += vote_delta
        else:
            # New vote
            new_vote = ForumVote(
                user_id=g.current_user.id,
                vote_type=vote_type,
                post_id=post_id
            )
            db.session.add(new_vote)
            
            if vote_type == 'helpful':
                post.helpful_count += 1
            else:
                vote_delta = 1 if vote_type == 'upvote' else -1
                post.vote_score += vote_delta
        
        # Update author reputation
        author_reputation = UserReputation.query.filter_by(user_id=post.author_id).first()
        if author_reputation:
            if vote_type == 'upvote':
                author_reputation.add_score(5, 'post')
            elif vote_type == 'downvote':
                author_reputation.add_score(-2, 'post')
            elif vote_type == 'helpful':
                author_reputation.add_score(15, 'helpful')
        
        db.session.commit()
        
        return create_success_response({
            'vote_score': post.vote_score,
            'helpful_count': post.helpful_count,
            'user_vote': vote_type if not (existing_vote and existing_vote.vote_type == vote_type) else None
        })
        
    except Exception as e:
        db.session.rollback()
        return create_error_response(f"Failed to vote on post: {str(e)}", 500)


# User Reputation

@app.route('/api/v1/forum/users/<int:user_id>/reputation', methods=['GET'])
@security_headers
def get_user_reputation(user_id):
    """
    Get user's forum reputation.
    ---
    tags:
      - Forum
    summary: Get user reputation
    description: Retrieve a user's forum reputation and statistics
    parameters:
      - in: path
        name: user_id
        type: integer
        required: true
        description: User ID
    responses:
      200:
        description: Reputation retrieved successfully
      404:
        description: User not found
    """
    try:
        user = User.query.get(user_id)
        if not user:
            return create_error_response("User not found", 404)
        
        reputation = UserReputation.query.filter_by(user_id=user_id).first()
        if not reputation:
            # Create initial reputation
            reputation = UserReputation(user_id=user_id)
            db.session.add(reputation)
            db.session.commit()
        
        return create_success_response({
            'reputation': reputation.to_dict(),
            'user': {
                'id': user.id,
                'display_name': user.display_name,
                'profile_image_url': user.profile_image_url
            }
        })
        
    except Exception as e:
        return create_error_response(f"Failed to retrieve reputation: {str(e)}", 500)


# Search

@app.route('/api/v1/forum/search', methods=['GET'])
@security_headers
def search_forum():
    """
    Search forum content.
    ---
    tags:
      - Forum
    summary: Search forum
    description: Search threads and posts across the forum
    parameters:
      - in: query
        name: q
        type: string
        required: true
        description: Search query
      - in: query
        name: category_id
        type: integer
        description: Limit search to specific category
      - in: query
        name: content_type
        type: string
        enum: [threads, posts, all]
        default: all
        description: Type of content to search
      - in: query
        name: page
        type: integer
        default: 1
        description: Page number
      - in: query
        name: limit
        type: integer
        default: 20
        description: Results per page
    responses:
      200:
        description: Search results retrieved successfully
      400:
        description: Invalid search query
    """
    try:
        query = request.args.get('q', '').strip()
        if not query or len(query) < 2:
            return create_error_response("Search query must be at least 2 characters", 400)
        
        category_id = request.args.get('category_id', type=int)
        content_type = request.args.get('content_type', 'all')
        page = max(1, request.args.get('page', 1, type=int))
        limit = min(50, max(1, request.args.get('limit', 20, type=int)))
        
        results = {'threads': [], 'posts': [], 'total': 0}
        
        if content_type in ['threads', 'all']:
            # Search threads
            thread_query = ForumThread.query.filter(
                and_(
                    or_(
                        ForumThread.title.ilike(f'%{query}%'),
                        ForumThread.content.ilike(f'%{query}%')
                    ),
                    ForumThread.is_deleted == False,
                    ForumThread.is_approved == True
                )
            )
            
            if category_id:
                thread_query = thread_query.filter_by(category_id=category_id)
            
            threads = thread_query.order_by(desc(ForumThread.last_activity_at)).limit(limit).all()
            results['threads'] = [thread.to_dict(include_author=True) for thread in threads]
        
        if content_type in ['posts', 'all']:
            # Search posts
            post_query = ForumPost.query.join(ForumThread).filter(
                and_(
                    ForumPost.content.ilike(f'%{query}%'),
                    ForumPost.is_deleted == False,
                    ForumPost.is_approved == True,
                    ForumThread.is_deleted == False,
                    ForumThread.is_approved == True
                )
            )
            
            if category_id:
                post_query = post_query.filter(ForumThread.category_id == category_id)
            
            posts = post_query.order_by(desc(ForumPost.created_at)).limit(limit).all()
            results['posts'] = [post.to_dict(include_author=True, include_thread=True) for post in posts]
        
        results['total'] = len(results['threads']) + len(results['posts'])
        
        return create_success_response(results)
        
    except Exception as e:
        return create_error_response(f"Search failed: {str(e)}", 500)


# Badge System

@app.route('/api/v1/forum/badges', methods=['GET'])
@security_headers
def get_forum_badges():
    """
    Get all available forum badges.
    ---
    tags:
      - Forum
    summary: Get forum badges
    description: Retrieve all available forum badges and achievements
    responses:
      200:
        description: Badges retrieved successfully
    """
    try:
        badges = UserBadge.query.filter_by(is_active=True).order_by(UserBadge.rarity, UserBadge.name).all()
        
        return create_success_response({
            'badges': [badge.to_dict() for badge in badges]
        })
        
    except Exception as e:
        return create_error_response(f"Failed to retrieve badges: {str(e)}", 500)


# Moderation (basic endpoints - would need admin role checks)

@app.route('/api/v1/forum/threads/<int:thread_id>/lock', methods=['POST'])
@rate_limit("10 per hour")
@security_headers
@auth_required
def lock_thread(thread_id):
    """
    Lock a forum thread (moderator only).
    ---
    tags:
      - Forum
    summary: Lock thread
    description: Lock a thread to prevent new posts (requires moderation privileges)
    parameters:
      - in: path
        name: thread_id
        type: integer
        required: true
        description: Thread ID
      - in: body
        name: moderation_data
        schema:
          type: object
          required:
            - reason
          properties:
            reason:
              type: string
              description: Reason for locking
    responses:
      200:
        description: Thread locked successfully
      403:
        description: Moderation privileges required
      404:
        description: Thread not found
    """
    try:
        # TODO: Add proper moderator role check
        # For now, allow thread author or any user to lock (demo purposes)
        
        thread = ForumThread.query.get(thread_id)
        if not thread:
            return create_error_response("Thread not found", 404)
        
        data = request.get_json()
        reason = sanitize_input(data.get('reason', '').strip()) if data else ''
        if not reason:
            return create_error_response("Reason is required", 400)
        
        thread.is_locked = True
        
        # Log moderation action
        moderation = ForumModeration(
            moderator_id=g.current_user.id,
            action_type='lock',
            reason=reason,
            thread_id=thread_id
        )
        db.session.add(moderation)
        
        db.session.commit()
        
        return create_success_response({
            'message': 'Thread locked successfully',
            'thread': thread.to_dict()
        })
        
    except Exception as e:
        db.session.rollback()
        return create_error_response(f"Failed to lock thread: {str(e)}", 500)