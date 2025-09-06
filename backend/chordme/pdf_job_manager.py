"""
PDF Export Job Management System

Handles asynchronous PDF generation with progress tracking, error handling,
and temporary file cleanup. Provides a simple background job system without
requiring external job queue dependencies.
"""

import os
import threading
import time
import tempfile
import logging
from datetime import datetime, timedelta
from pathlib import Path
from typing import List, Dict, Optional, Any

from . import db, app
from .models import PDFExportJob, Song, User, utc_now
from .pdf_generator import generate_song_pdf, ChordProPDFGenerator
from .permission_helpers import check_song_permission

logger = logging.getLogger(__name__)


class PDFJobManager:
    """
    Manages asynchronous PDF generation jobs with progress tracking and cleanup.
    Uses threading for simplicity - in production, consider using Celery or similar.
    """
    
    def __init__(self):
        self.temp_dir = None
        self.cleanup_thread = None
        self.shutdown_event = threading.Event()
        self._setup_temp_directory()
        self._start_cleanup_thread()
    
    def _setup_temp_directory(self):
        """Create temporary directory for PDF files."""
        try:
            # Create temp directory in app instance path or system temp
            if hasattr(app, 'instance_path'):
                base_dir = Path(app.instance_path) / 'temp' / 'pdf_exports'
            else:
                base_dir = Path(tempfile.gettempdir()) / 'chordme_pdf_exports'
            
            base_dir.mkdir(parents=True, exist_ok=True)
            self.temp_dir = str(base_dir)
            logger.info(f"PDF temp directory: {self.temp_dir}")
            
        except Exception as e:
            logger.error(f"Failed to create temp directory: {e}")
            self.temp_dir = tempfile.gettempdir()
    
    def _start_cleanup_thread(self):
        """Start background thread for cleaning up expired files."""
        self.cleanup_thread = threading.Thread(
            target=self._cleanup_worker,
            daemon=True,
            name="PDFCleanupWorker"
        )
        self.cleanup_thread.start()
    
    def _cleanup_worker(self):
        """Background worker to clean up expired PDF files."""
        while not self.shutdown_event.is_set():
            try:
                self._cleanup_expired_files()
                # Sleep for 1 hour between cleanup runs
                self.shutdown_event.wait(3600)
            except Exception as e:
                logger.error(f"Error in cleanup worker: {e}")
                self.shutdown_event.wait(300)  # Wait 5 minutes on error
    
    def _cleanup_expired_files(self):
        """Clean up expired PDF files and database records."""
        try:
            with app.app_context():
                # Find expired jobs
                expired_jobs = PDFExportJob.query.filter(
                    PDFExportJob.expires_at < utc_now(),
                    PDFExportJob.output_file_path.isnot(None)
                ).all()
                
                for job in expired_jobs:
                    try:
                        # Delete file if it exists
                        if job.output_file_path and os.path.exists(job.output_file_path):
                            os.remove(job.output_file_path)
                            logger.info(f"Cleaned up expired file: {job.output_file_path}")
                        
                        # Remove database record
                        db.session.delete(job)
                        
                    except Exception as e:
                        logger.error(f"Error cleaning up job {job.id}: {e}")
                
                # Commit all deletions
                if expired_jobs:
                    db.session.commit()
                    logger.info(f"Cleaned up {len(expired_jobs)} expired PDF jobs")
                
        except Exception as e:
            logger.error(f"Error in cleanup process: {e}")
    
    def create_job(self, user_id: int, job_type: str, song_ids: List[int] = None,
                   export_options: Dict = None) -> PDFExportJob:
        """Create a new PDF export job."""
        job = PDFExportJob(
            user_id=user_id,
            job_type=job_type,
            song_ids=song_ids or [],
            export_options=export_options or {}
        )
        
        db.session.add(job)
        db.session.commit()
        
        logger.info(f"Created PDF export job {job.id} for user {user_id}")
        return job
    
    def start_job_async(self, job_id: int):
        """Start processing a job asynchronously."""
        thread = threading.Thread(
            target=self._process_job,
            args=(job_id,),
            daemon=True,
            name=f"PDFJob-{job_id}"
        )
        thread.start()
        logger.info(f"Started async processing for job {job_id}")
    
    def _process_job(self, job_id: int):
        """Process a PDF export job in background thread."""
        try:
            with app.app_context():
                job = PDFExportJob.query.get(job_id)
                if not job:
                    logger.error(f"Job {job_id} not found")
                    return
                
                job.update_progress(status='processing')
                db.session.commit()
                
                if job.job_type == 'single':
                    self._process_single_song_job(job)
                elif job.job_type == 'batch':
                    self._process_batch_job(job)
                elif job.job_type == 'multi_song':
                    self._process_multi_song_job(job)
                else:
                    job.mark_error(f"Unknown job type: {job.job_type}")
                
                db.session.commit()
                
        except Exception as e:
            logger.error(f"Error processing job {job_id}: {e}")
            try:
                with app.app_context():
                    job = PDFExportJob.query.get(job_id)
                    if job:
                        job.mark_error(f"Processing error: {str(e)}")
                        db.session.commit()
            except:
                pass
    
    def _process_single_song_job(self, job: PDFExportJob):
        """Process a single song PDF export job."""
        if not job.song_ids:
            job.mark_error("No song ID provided for single song export")
            return
        
        song_id = job.song_ids[0]
        
        # Check permissions
        song, has_permission = check_song_permission(song_id, job.user_id, 'read')
        if not song or not has_permission:
            job.mark_error(f"Song {song_id} not found or access denied")
            return
        
        try:
            # Update progress
            job.update_progress(progress=10)
            db.session.commit()
            
            # Generate PDF
            options = job.export_options
            pdf_bytes = generate_song_pdf(
                content=song.content,
                title=options.get('title') or song.title,
                artist=options.get('artist'),
                paper_size=options.get('paper_size', 'a4'),
                orientation=options.get('orientation', 'portrait'),
                template_name=options.get('template', 'classic'),
                include_chord_diagrams=options.get('chord_diagrams', False),
                diagram_instrument=options.get('instrument', 'guitar'),
                font_size=options.get('font_size', 11),
                quality=options.get('quality', 'standard'),
                header=options.get('header', ''),
                footer=options.get('footer', ''),
                margins=options.get('margins', {}),
                colors=options.get('colors', {})
            )
            
            # Update progress
            job.update_progress(progress=80)
            db.session.commit()
            
            # Save file
            filename = self._create_safe_filename(song.title, 'pdf')
            file_path = os.path.join(self.temp_dir, f"job_{job.id}_{filename}")
            
            with open(file_path, 'wb') as f:
                f.write(pdf_bytes)
            
            # Complete job
            job.mark_completed(file_path, filename, len(pdf_bytes))
            logger.info(f"Completed single song PDF job {job.id}")
            
        except Exception as e:
            job.mark_error(f"PDF generation failed: {str(e)}")
            logger.error(f"Single song PDF job {job.id} failed: {e}")
    
    def _process_batch_job(self, job: PDFExportJob):
        """Process a batch PDF export job (multiple PDFs in ZIP)."""
        import zipfile
        from io import BytesIO
        
        if not job.song_ids:
            job.mark_error("No song IDs provided for batch export")
            return
        
        try:
            job.update_progress(progress=5)
            db.session.commit()
            
            # Verify all songs exist and user has access
            songs = []
            for i, song_id in enumerate(job.song_ids):
                song, has_permission = check_song_permission(song_id, job.user_id, 'read')
                if not song or not has_permission:
                    job.mark_error(f"Song {song_id} not found or access denied")
                    return
                songs.append(song)
                
                # Update progress for verification phase (5-15%)
                progress = 5 + int((i / len(job.song_ids)) * 10)
                job.update_progress(progress=progress)
                db.session.commit()
            
            # Create ZIP file
            zip_filename = f"songs_export_{job.id}.zip"
            zip_path = os.path.join(self.temp_dir, zip_filename)
            
            options = job.export_options
            with zipfile.ZipFile(zip_path, 'w', zipfile.ZIP_DEFLATED) as zip_file:
                for i, song in enumerate(songs):
                    try:
                        # Generate PDF for this song
                        pdf_bytes = generate_song_pdf(
                            content=song.content,
                            title=song.title,
                            artist=getattr(song, 'artist', None),
                            paper_size=options.get('paper_size', 'a4'),
                            orientation=options.get('orientation', 'portrait'),
                            template_name=options.get('template', 'classic'),
                            include_chord_diagrams=options.get('chord_diagrams', False),
                            diagram_instrument=options.get('instrument', 'guitar'),
                            font_size=options.get('font_size', 11),
                            quality=options.get('quality', 'standard'),
                            header=options.get('header', ''),
                            footer=options.get('footer', ''),
                            margins=options.get('margins', {}),
                            colors=options.get('colors', {})
                        )
                        
                        # Add to ZIP
                        pdf_filename = self._create_safe_filename(song.title, 'pdf')
                        zip_file.writestr(pdf_filename, pdf_bytes)
                        
                        # Update progress (15-90%)
                        progress = 15 + int(((i + 1) / len(songs)) * 75)
                        job.update_progress(processed_count=i + 1, progress=progress)
                        db.session.commit()
                        
                    except Exception as e:
                        logger.error(f"Failed to generate PDF for song {song.id}: {e}")
                        # Add error file to ZIP
                        error_content = f"Error generating PDF for '{song.title}': {str(e)}"
                        error_filename = f"ERROR-{song.title[:30]}.txt"
                        zip_file.writestr(error_filename, error_content.encode('utf-8'))
            
            # Get file size
            file_size = os.path.getsize(zip_path)
            
            # Complete job
            job.mark_completed(zip_path, zip_filename, file_size)
            logger.info(f"Completed batch PDF job {job.id} with {len(songs)} songs")
            
        except Exception as e:
            job.mark_error(f"Batch export failed: {str(e)}")
            logger.error(f"Batch PDF job {job.id} failed: {e}")
    
    def _process_multi_song_job(self, job: PDFExportJob):
        """Process a multi-song PDF export job (single PDF with multiple songs)."""
        if not job.song_ids:
            job.mark_error("No song IDs provided for multi-song export")
            return
        
        try:
            job.update_progress(progress=5)
            db.session.commit()
            
            # Verify all songs exist and user has access
            songs = []
            for i, song_id in enumerate(job.song_ids):
                song, has_permission = check_song_permission(song_id, job.user_id, 'read')
                if not song or not has_permission:
                    job.mark_error(f"Song {song_id} not found or access denied")
                    return
                songs.append(song)
                
                # Update progress for verification phase (5-15%)
                progress = 5 + int((i / len(job.song_ids)) * 10)
                job.update_progress(progress=progress)
                db.session.commit()
            
            # Prepare songs data for multi-song PDF
            songs_data = []
            for song in songs:
                songs_data.append({
                    'title': song.title,
                    'content': song.content,
                    'artist': getattr(song, 'artist', None)
                })
            
            # Update progress
            job.update_progress(progress=20)
            db.session.commit()
            
            # Generate multi-song PDF
            options = job.export_options
            generator = ChordProPDFGenerator(
                paper_size=options.get('paper_size', 'a4'),
                orientation=options.get('orientation', 'portrait'),
                template_name=options.get('template', 'classic'),
                include_chord_diagrams=options.get('chord_diagrams', False),
                diagram_instrument=options.get('instrument', 'guitar'),
                font_size=options.get('font_size', 11),
                quality=options.get('quality', 'standard'),
                header=options.get('header', ''),
                footer=options.get('footer', ''),
                margins=options.get('margins', {}),
                colors=options.get('colors', {})
            )
            
            # Update progress
            job.update_progress(progress=30)
            db.session.commit()
            
            pdf_bytes = generator.create_multi_song_pdf(
                songs=songs_data,
                include_toc=options.get('include_toc', True)
            )
            
            # Update progress
            job.update_progress(progress=90)
            db.session.commit()
            
            # Save file
            filename = f"multi_song_export_{job.id}.pdf"
            file_path = os.path.join(self.temp_dir, filename)
            
            with open(file_path, 'wb') as f:
                f.write(pdf_bytes)
            
            # Complete job
            job.mark_completed(file_path, filename, len(pdf_bytes))
            logger.info(f"Completed multi-song PDF job {job.id} with {len(songs)} songs")
            
        except Exception as e:
            job.mark_error(f"Multi-song export failed: {str(e)}")
            logger.error(f"Multi-song PDF job {job.id} failed: {e}")
    
    def _create_safe_filename(self, title: str, extension: str) -> str:
        """Create a safe filename from song title."""
        import re
        safe_title = re.sub(r'[^\w\s-]', '', title or 'song')
        safe_title = re.sub(r'[-\s]+', '-', safe_title).strip('-')
        return f"{safe_title[:50]}.{extension}"
    
    def get_job(self, job_id: int) -> Optional[PDFExportJob]:
        """Get job by ID."""
        return PDFExportJob.query.get(job_id)
    
    def get_user_jobs(self, user_id: int, limit: int = 50) -> List[PDFExportJob]:
        """Get jobs for a specific user."""
        return PDFExportJob.query.filter_by(user_id=user_id)\
                                 .order_by(PDFExportJob.created_at.desc())\
                                 .limit(limit).all()
    
    def cancel_job(self, job_id: int) -> bool:
        """Cancel a job if possible."""
        job = PDFExportJob.query.get(job_id)
        if job and job.can_be_cancelled():
            job.update_progress(status='cancelled')
            db.session.commit()
            return True
        return False
    
    def get_file_path(self, job_id: int) -> Optional[str]:
        """Get file path for a completed job."""
        job = PDFExportJob.query.get(job_id)
        if job and job.status == 'completed' and job.output_file_path:
            if os.path.exists(job.output_file_path):
                return job.output_file_path
        return None
    
    def shutdown(self):
        """Shutdown the job manager."""
        self.shutdown_event.set()
        if self.cleanup_thread:
            self.cleanup_thread.join(timeout=5)


# Global instance
pdf_job_manager = PDFJobManager()