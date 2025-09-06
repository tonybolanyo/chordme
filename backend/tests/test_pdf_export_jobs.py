"""
Test cases for PDF Export Job functionality.
Tests the async PDF generation system and job management.
"""

import pytest
import tempfile
import os
from datetime import datetime, timedelta

from chordme import app, db
from chordme.models import User, Song, PDFExportJob
from chordme.pdf_job_manager import PDFJobManager


class TestPDFExportJob:
    """Test cases for the PDFExportJob model."""
    
    @pytest.fixture
    def client(self):
        """Create test client with in-memory database."""
        app.config['TESTING'] = True
        app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///:memory:'
        
        with app.test_client() as client:
            with app.app_context():
                db.create_all()
                yield client
                db.drop_all()
    
    @pytest.fixture
    def sample_user(self, client):
        """Create a sample user."""
        user = User(email='test@example.com', password='TestPassword123!')
        db.session.add(user)
        db.session.commit()
        return user
    
    @pytest.fixture
    def sample_song(self, sample_user):
        """Create a sample song."""
        song = Song(
            title='Test Song',
            content='{title: Test Song}\n{artist: Test Artist}\n\n[C]Hello [G]world',
            author_id=sample_user.id
        )
        db.session.add(song)
        db.session.commit()
        return song
    
    def test_pdf_export_job_creation(self, sample_user, sample_song):
        """Test creating a PDF export job."""
        job = PDFExportJob(
            user_id=sample_user.id,
            job_type='single',
            song_ids=[sample_song.id],
            export_options={'paper_size': 'a4', 'template': 'classic'}
        )
        
        db.session.add(job)
        db.session.commit()
        
        assert job.id is not None
        assert job.user_id == sample_user.id
        assert job.job_type == 'single'
        assert job.song_ids == [sample_song.id]
        assert job.status == 'pending'
        assert job.progress == 0
        assert job.total_count == 1
        assert job.export_options['paper_size'] == 'a4'
        assert job.expires_at is not None
    
    def test_pdf_export_job_progress_update(self, sample_user, sample_song):
        """Test updating job progress."""
        job = PDFExportJob(
            user_id=sample_user.id,
            job_type='single',
            song_ids=[sample_song.id]
        )
        
        db.session.add(job)
        db.session.commit()
        
        # Test progress update
        job.update_progress(processed_count=1, status='processing')
        assert job.processed_count == 1
        assert job.progress == 100  # 1/1 = 100%
        assert job.status == 'processing'
        assert job.started_at is not None
        
        # Test completion
        job.update_progress(status='completed')
        assert job.status == 'completed'
        assert job.completed_at is not None
    
    def test_pdf_export_job_error_handling(self, sample_user, sample_song):
        """Test job error handling."""
        job = PDFExportJob(
            user_id=sample_user.id,
            job_type='single',
            song_ids=[sample_song.id]
        )
        
        db.session.add(job)
        db.session.commit()
        
        # Test error marking
        error_msg = "Test error occurred"
        error_details = {"code": "TEST_ERROR", "line": 42}
        
        job.mark_error(error_msg, error_details)
        
        assert job.status == 'failed'
        assert job.error_message == error_msg
        assert job.error_details == error_details
        assert job.completed_at is not None
    
    def test_pdf_export_job_completion(self, sample_user, sample_song):
        """Test job completion."""
        job = PDFExportJob(
            user_id=sample_user.id,
            job_type='single',
            song_ids=[sample_song.id]
        )
        
        db.session.add(job)
        db.session.commit()
        
        # Test completion
        file_path = "/tmp/test_job.pdf"
        filename = "test_job.pdf"
        file_size = 1024
        
        job.mark_completed(file_path, filename, file_size)
        
        assert job.status == 'completed'
        assert job.progress == 100
        assert job.output_file_path == file_path
        assert job.output_filename == filename
        assert job.file_size == file_size
        assert job.completed_at is not None
    
    def test_pdf_export_job_expiration(self, sample_user, sample_song):
        """Test job expiration checking."""
        job = PDFExportJob(
            user_id=sample_user.id,
            job_type='single',
            song_ids=[sample_song.id]
        )
        
        db.session.add(job)
        db.session.commit()
        
        # Set expiration to past (using UTC)
        from chordme.models import utc_now
        job.expires_at = utc_now() - timedelta(hours=1)
        
        assert job.is_expired() is True
        
        # Set expiration to future
        job.expires_at = utc_now() + timedelta(hours=1)
        
        assert job.is_expired() is False
    
    def test_pdf_export_job_cancellation(self, sample_user, sample_song):
        """Test job cancellation."""
        job = PDFExportJob(
            user_id=sample_user.id,
            job_type='single',
            song_ids=[sample_song.id]
        )
        
        db.session.add(job)
        db.session.commit()
        
        # Test pending job can be cancelled (default status is 'pending')
        assert job.status == 'pending'
        assert job.can_be_cancelled() is True
        
        # Test processing job can be cancelled
        job.status = 'processing'
        assert job.can_be_cancelled() is True
        
        # Test completed job cannot be cancelled
        job.status = 'completed'
        assert job.can_be_cancelled() is False
        
        # Test failed job cannot be cancelled
        job.status = 'failed'
        assert job.can_be_cancelled() is False
    
    def test_pdf_export_job_to_dict(self, sample_user, sample_song):
        """Test job serialization to dictionary."""
        job = PDFExportJob(
            user_id=sample_user.id,
            job_type='batch',
            song_ids=[sample_song.id],
            export_options={'paper_size': 'letter', 'orientation': 'landscape'}
        )
        
        db.session.add(job)
        db.session.commit()
        
        # Test basic serialization
        job_dict = job.to_dict(include_details=False)
        
        assert job_dict['id'] == job.id
        assert job_dict['user_id'] == job.user_id
        assert job_dict['job_type'] == 'batch'
        assert job_dict['status'] == 'pending'
        assert job_dict['progress'] == 0
        assert 'song_ids' not in job_dict  # Should not be included when include_details=False
        
        # Test detailed serialization
        job_dict_detailed = job.to_dict(include_details=True)
        
        assert job_dict_detailed['song_ids'] == [sample_song.id]
        assert job_dict_detailed['export_options']['paper_size'] == 'letter'
        assert job_dict_detailed['error_message'] is None
        assert job_dict_detailed['duration'] is None
    
    def test_pdf_export_job_duration(self, sample_user, sample_song):
        """Test job duration calculation."""
        job = PDFExportJob(
            user_id=sample_user.id,
            job_type='single',
            song_ids=[sample_song.id]
        )
        
        # No duration when not started
        assert job.get_duration() is None
        
        # Set started time
        start_time = datetime.now()
        job.started_at = start_time
        
        # Still no duration when not completed
        assert job.get_duration() is None
        
        # Set completed time
        end_time = start_time + timedelta(seconds=30)
        job.completed_at = end_time
        
        # Should return duration in seconds
        duration = job.get_duration()
        assert duration == 30.0


class TestPDFJobManager:
    """Test cases for the PDFJobManager."""
    
    @pytest.fixture
    def client(self):
        """Create test client with in-memory database."""
        app.config['TESTING'] = True
        app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///:memory:'
        
        with app.test_client() as client:
            with app.app_context():
                db.create_all()
                yield client
                db.drop_all()
    
    @pytest.fixture
    def sample_user(self, client):
        """Create a sample user."""
        user = User(email='test@example.com', password='TestPassword123!')
        db.session.add(user)
        db.session.commit()
        return user
    
    @pytest.fixture
    def sample_song(self, sample_user):
        """Create a sample song."""
        song = Song(
            title='Test Song',
            content='{title: Test Song}\n{artist: Test Artist}\n\n[C]Hello [G]world',
            author_id=sample_user.id
        )
        db.session.add(song)
        db.session.commit()
        return song
    
    @pytest.fixture
    def job_manager(self):
        """Create a PDFJobManager instance."""
        # Use a temporary directory for testing
        with tempfile.TemporaryDirectory() as temp_dir:
            manager = PDFJobManager()
            manager.temp_dir = temp_dir
            yield manager
            manager.shutdown()
    
    def test_job_manager_create_job(self, sample_user, sample_song, job_manager):
        """Test creating a job through the manager."""
        job = job_manager.create_job(
            user_id=sample_user.id,
            job_type='single',
            song_ids=[sample_song.id],
            export_options={'paper_size': 'a4'}
        )
        
        assert job.id is not None
        assert job.user_id == sample_user.id
        assert job.job_type == 'single'
        assert job.song_ids == [sample_song.id]
        assert job.status == 'pending'
    
    def test_job_manager_get_job(self, sample_user, sample_song, job_manager):
        """Test retrieving a job."""
        job = job_manager.create_job(
            user_id=sample_user.id,
            job_type='single',
            song_ids=[sample_song.id]
        )
        
        retrieved_job = job_manager.get_job(job.id)
        assert retrieved_job is not None
        assert retrieved_job.id == job.id
        assert retrieved_job.user_id == job.user_id
    
    def test_job_manager_get_user_jobs(self, sample_user, sample_song, job_manager):
        """Test retrieving jobs for a user."""
        # Create multiple jobs
        job1 = job_manager.create_job(
            user_id=sample_user.id,
            job_type='single',
            song_ids=[sample_song.id]
        )
        
        job2 = job_manager.create_job(
            user_id=sample_user.id,
            job_type='batch',
            song_ids=[sample_song.id]
        )
        
        user_jobs = job_manager.get_user_jobs(sample_user.id)
        
        assert len(user_jobs) == 2
        job_ids = [job.id for job in user_jobs]
        assert job1.id in job_ids
        assert job2.id in job_ids
    
    def test_job_manager_cancel_job(self, sample_user, sample_song, job_manager):
        """Test cancelling a job."""
        job = job_manager.create_job(
            user_id=sample_user.id,
            job_type='single',
            song_ids=[sample_song.id]
        )
        
        # Job should be cancellable when pending
        success = job_manager.cancel_job(job.id)
        assert success is True
        
        # Refresh job from database
        cancelled_job = job_manager.get_job(job.id)
        assert cancelled_job.status == 'cancelled'
        
        # Job should not be cancellable when cancelled
        success = job_manager.cancel_job(job.id)
        assert success is False
    
    def test_safe_filename_creation(self, job_manager):
        """Test safe filename creation."""
        # Test normal title
        filename = job_manager._create_safe_filename("My Song Title", "pdf")
        assert filename == "My-Song-Title.pdf"
        
        # Test title with special characters
        filename = job_manager._create_safe_filename("Song/With\\Special*Characters", "pdf")
        assert filename == "SongWithSpecialCharacters.pdf"
        
        # Test very long title
        long_title = "A" * 100
        filename = job_manager._create_safe_filename(long_title, "pdf")
        assert len(filename) <= 54  # 50 chars + .pdf
        
        # Test empty title
        filename = job_manager._create_safe_filename("", "pdf")
        assert filename == "song.pdf"