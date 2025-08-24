"""Integration tests for song sharing and permission validation."""

import pytest
from chordme import app, db
from chordme.models import User, Song


class TestSongSharingIntegration:
    """Integration tests for comprehensive song sharing functionality."""
    
    def test_multi_user_sharing_scenario(self):
        """Test complex multi-user sharing scenario."""
        with app.app_context():
            db.create_all()
            
            # Create users
            owner = User('owner@example.com', 'TestPassword123')
            editor = User('editor@example.com', 'TestPassword123')
            reader1 = User('reader1@example.com', 'TestPassword123')
            reader2 = User('reader2@example.com', 'TestPassword123')
            public_user = User('public@example.com', 'TestPassword123')
            
            for user in [owner, editor, reader1, reader2, public_user]:
                db.session.add(user)
            db.session.commit()
            
            # Create song with complex sharing setup
            song = Song(
                'Collaborative Song',
                owner.id,
                'C G Am F\nCollaborative content',
                share_settings='link-shared'
            )
            
            # Add users with different permission levels
            song.add_shared_user(editor.id, 'edit')
            song.add_shared_user(reader1.id, 'read')
            song.add_shared_user(reader2.id, 'read')
            
            db.session.add(song)
            db.session.commit()
            
            # Validate access permissions
            assert song.can_user_access(owner.id)  # Owner
            assert song.can_user_access(editor.id)  # Editor
            assert song.can_user_access(reader1.id)  # Reader 1
            assert song.can_user_access(reader2.id)  # Reader 2
            assert not song.can_user_access(public_user.id)  # No access (link-shared ≠ public)
            
            # Validate permission levels
            assert song.get_user_permission(editor.id) == 'edit'
            assert song.get_user_permission(reader1.id) == 'read'
            assert song.get_user_permission(reader2.id) == 'read'
            assert song.get_user_permission(public_user.id) is None
            
            # Test permission changes
            song.add_shared_user(reader1.id, 'admin')
            assert song.get_user_permission(reader1.id) == 'admin'
            
            # Test user removal
            song.remove_shared_user(reader2.id)
            assert not song.can_user_access(reader2.id)
            assert song.get_user_permission(reader2.id) is None
            
            # Cleanup
            for user in [owner, editor, reader1, reader2, public_user]:
                db.session.delete(user)
            db.session.delete(song)
            db.session.commit()
    
    def test_permission_hierarchy_validation(self):
        """Test that permission levels work as expected."""
        with app.app_context():
            db.create_all()
            
            # Create users
            owner = User('hierarchy_owner@example.com', 'TestPassword123')
            admin_user = User('admin_user@example.com', 'TestPassword123')
            edit_user = User('edit_user@example.com', 'TestPassword123')
            read_user = User('read_user@example.com', 'TestPassword123')
            
            for user in [owner, admin_user, edit_user, read_user]:
                db.session.add(user)
            db.session.commit()
            
            # Create song with different permission levels
            song = Song('Permission Hierarchy Song', owner.id, 'Test content')
            song.add_shared_user(admin_user.id, 'admin')
            song.add_shared_user(edit_user.id, 'edit')
            song.add_shared_user(read_user.id, 'read')
            
            db.session.add(song)
            db.session.commit()
            
            # Verify permission levels are correctly assigned
            permissions = {
                admin_user.id: 'admin',
                edit_user.id: 'edit',
                read_user.id: 'read'
            }
            
            for user_id, expected_permission in permissions.items():
                assert song.get_user_permission(user_id) == expected_permission
                assert song.is_shared_with_user(user_id)
                assert song.can_user_access(user_id)
            
            # Test to_dict includes correct permissions
            song_dict = song.to_dict()
            assert song_dict['permissions'][str(admin_user.id)] == 'admin'
            assert song_dict['permissions'][str(edit_user.id)] == 'edit'
            assert song_dict['permissions'][str(read_user.id)] == 'read'
            
            # Cleanup
            for user in [owner, admin_user, edit_user, read_user]:
                db.session.delete(user)
            db.session.delete(song)
            db.session.commit()
    
    def test_share_settings_validation(self):
        """Test different share settings and their access implications."""
        with app.app_context():
            db.create_all()
            
            # Create users
            owner = User('settings_owner@example.com', 'TestPassword123')
            shared_user = User('settings_shared@example.com', 'TestPassword123')
            random_user = User('settings_random@example.com', 'TestPassword123')
            
            for user in [owner, shared_user, random_user]:
                db.session.add(user)
            db.session.commit()
            
            # Test private song
            private_song = Song('Private Song', owner.id, 'Private content', share_settings='private')
            private_song.add_shared_user(shared_user.id, 'read')
            db.session.add(private_song)
            
            # Test public song
            public_song = Song('Public Song', owner.id, 'Public content', share_settings='public')
            db.session.add(public_song)
            
            # Test link-shared song
            link_shared_song = Song('Link Shared Song', owner.id, 'Link shared content', share_settings='link-shared')
            link_shared_song.add_shared_user(shared_user.id, 'edit')
            db.session.add(link_shared_song)
            
            db.session.commit()
            
            # Private song access validation
            assert private_song.can_user_access(owner.id)  # Owner
            assert private_song.can_user_access(shared_user.id)  # Explicitly shared
            assert not private_song.can_user_access(random_user.id)  # No access
            
            # Public song access validation
            assert public_song.can_user_access(owner.id)  # Owner
            assert public_song.can_user_access(shared_user.id)  # Public access
            assert public_song.can_user_access(random_user.id)  # Public access
            
            # Link-shared song access validation
            assert link_shared_song.can_user_access(owner.id)  # Owner
            assert link_shared_song.can_user_access(shared_user.id)  # Explicitly shared
            assert not link_shared_song.can_user_access(random_user.id)  # No explicit sharing
            
            # Verify share_settings in to_dict
            assert private_song.to_dict()['share_settings'] == 'private'
            assert public_song.to_dict()['share_settings'] == 'public'
            assert link_shared_song.to_dict()['share_settings'] == 'link-shared'
            
            # Cleanup
            for user in [owner, shared_user, random_user]:
                db.session.delete(user)
            for song in [private_song, public_song, link_shared_song]:
                db.session.delete(song)
            db.session.commit()
    
    def test_edge_cases_and_error_handling(self):
        """Test edge cases and error handling in sharing functionality."""
        with app.app_context():
            db.create_all()
            
            # Create users
            owner = User('edge_owner@example.com', 'TestPassword123')
            user = User('edge_user@example.com', 'TestPassword123')
            
            for u in [owner, user]:
                db.session.add(u)
            db.session.commit()
            
            # Create song
            song = Song('Edge Case Song', owner.id, 'Edge case content')
            db.session.add(song)
            db.session.commit()
            
            # Test invalid permission level
            with pytest.raises(ValueError):
                song.add_shared_user(user.id, 'invalid_permission')
            
            # Test adding same user multiple times (should not duplicate)
            song.add_shared_user(user.id, 'read')
            initial_count = len(song.shared_with)
            song.add_shared_user(user.id, 'edit')  # Should update, not duplicate
            assert len(song.shared_with) == initial_count
            assert song.get_user_permission(user.id) == 'edit'
            
            # Test removing non-existent user (should not raise error)
            song.remove_shared_user(99999)  # Non-existent user ID
            
            # Test methods with None values
            empty_song = Song('Empty Song', owner.id, 'Empty content')
            empty_song.shared_with = None
            empty_song.permissions = None
            db.session.add(empty_song)
            db.session.commit()
            
            # Should handle None values gracefully
            assert not empty_song.is_shared_with_user(user.id)
            assert empty_song.get_user_permission(user.id) is None
            assert empty_song.can_user_access(owner.id)  # Owner should still have access
            assert not empty_song.can_user_access(user.id)
            
            # Adding user should initialize None values
            empty_song.add_shared_user(user.id, 'read')
            assert empty_song.shared_with == [user.id]
            assert empty_song.permissions == {str(user.id): 'read'}
            
            # Cleanup
            for u in [owner, user]:
                db.session.delete(u)
            for s in [song, empty_song]:
                db.session.delete(s)
            db.session.commit()
    
    def test_permission_persistence(self):
        """Test that sharing permissions persist correctly across database operations."""
        import uuid
        
        with app.app_context():
            db.create_all()
            
            # Create users with unique emails
            unique_suffix = str(uuid.uuid4())[:8]
            owner = User(f'persist_owner_{unique_suffix}@example.com', 'TestPassword123')
            user1 = User(f'persist_user1_{unique_suffix}@example.com', 'TestPassword123')
            user2 = User(f'persist_user2_{unique_suffix}@example.com', 'TestPassword123')
            
            for user in [owner, user1, user2]:
                db.session.add(user)
            db.session.commit()
            
            # Get user IDs before expunging
            owner_id = owner.id
            user1_id = user1.id
            user2_id = user2.id
            
            # Create song with sharing
            song = Song(
                'Persistent Song',
                owner_id,
                'Persistent content',
                shared_with=[user1_id, user2_id],
                permissions={str(user1_id): 'admin', str(user2_id): 'read'},
                share_settings='link-shared'
            )
            db.session.add(song)
            db.session.commit()
            
            song_id = song.id
            
            # Clear session to force reload from database
            db.session.expunge_all()
            
            # Reload song from database
            reloaded_song = db.session.get(Song, song_id)
            
            # Verify all sharing data persisted correctly
            assert reloaded_song.shared_with == [user1_id, user2_id]
            assert reloaded_song.permissions == {str(user1_id): 'admin', str(user2_id): 'read'}
            assert reloaded_song.share_settings == 'link-shared'
            
            # Verify helper methods work with reloaded data
            assert reloaded_song.is_shared_with_user(user1_id)
            assert reloaded_song.is_shared_with_user(user2_id)
            assert reloaded_song.get_user_permission(user1_id) == 'admin'
            assert reloaded_song.get_user_permission(user2_id) == 'read'
            assert reloaded_song.can_user_access(user1_id)
            assert reloaded_song.can_user_access(user2_id)
            
            # Verify to_dict works with reloaded data
            song_dict = reloaded_song.to_dict()
            assert song_dict['shared_with'] == [user1_id, user2_id]
            assert song_dict['permissions'] == {str(user1_id): 'admin', str(user2_id): 'read'}
            assert song_dict['share_settings'] == 'link-shared'
            
            # Cleanup by IDs to avoid session issues
            db.session.delete(reloaded_song)
            
            # Reload users for cleanup
            owner = db.session.get(User, owner_id)
            user1 = db.session.get(User, user1_id)
            user2 = db.session.get(User, user2_id)
            
            for user in [owner, user1, user2]:
                if user:
                    db.session.delete(user)
            db.session.commit()
    
    def test_database_indexing_queries(self):
        """Test that database queries work efficiently with the sharing model."""
        with app.app_context():
            db.create_all()
            
            # Clean existing data to ensure test isolation
            db.session.query(Song).delete()
            db.session.query(User).delete()
            db.session.commit()
            
            # Create multiple users
            users = []
            for i in range(5):
                user = User(f'query_user{i}@example.com', 'TestPassword123')
                users.append(user)
                db.session.add(user)
            db.session.commit()
            
            # Create multiple songs with different sharing settings
            songs = []
            for i, user in enumerate(users):
                # Private song
                private_song = Song(f'Private Song {i}', user.id, f'Private content {i}', share_settings='private')
                songs.append(private_song)
                
                # Public song
                public_song = Song(f'Public Song {i}', user.id, f'Public content {i}', share_settings='public')
                songs.append(public_song)
                
                # Link-shared song
                link_song = Song(f'Link Song {i}', user.id, f'Link content {i}', share_settings='link-shared')
                # Share with next user in list (circular)
                next_user = users[(i + 1) % len(users)]
                link_song.add_shared_user(next_user.id, 'read')
                songs.append(link_song)
            
            for song in songs:
                db.session.add(song)
            db.session.commit()
            
            # Test queries that would benefit from indexing
            
            # Query by author_id (should use idx_songs_author_id)
            user_songs = Song.query.filter_by(author_id=users[0].id).all()
            assert len(user_songs) == 3  # 3 songs per user
            
            # Query by share_settings (should use idx_songs_share_settings)
            public_songs = Song.query.filter_by(share_settings='public').all()
            assert len(public_songs) == 5  # 1 public song per user
            
            private_songs = Song.query.filter_by(share_settings='private').all()
            assert len(private_songs) == 5  # 1 private song per user
            
            link_shared_songs = Song.query.filter_by(share_settings='link-shared').all()
            assert len(link_shared_songs) == 5  # 1 link-shared song per user
            
            # Verify that all songs have the expected sharing data structure
            for song in songs:
                song_dict = song.to_dict()
                assert 'shared_with' in song_dict
                assert 'permissions' in song_dict
                assert 'share_settings' in song_dict
                assert song_dict['share_settings'] in ['private', 'public', 'link-shared']
            
            # Cleanup
            for user in users:
                db.session.delete(user)
            for song in songs:
                db.session.delete(song)
            db.session.commit()