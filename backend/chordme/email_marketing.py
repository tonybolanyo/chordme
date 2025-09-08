"""
Email marketing integration for growth and engagement campaigns
"""

from . import app
from .models import User, UserOnboardingProgress, UserReferral, DailyChallenge
from flask import current_app
import smtplib
from email.mime.text import MimeText
from email.mime.multipart import MimeMultipart
from datetime import datetime, timedelta, date
import logging

logger = logging.getLogger(__name__)


class EmailMarketingService:
    """Service for managing growth and engagement email campaigns."""
    
    def __init__(self):
        self.smtp_server = None
        self.from_email = None
        
    def init_app(self, app):
        """Initialize email service with app configuration."""
        self.smtp_server = app.config.get('SMTP_SERVER')
        self.smtp_port = app.config.get('SMTP_PORT', 587)
        self.smtp_username = app.config.get('SMTP_USERNAME')
        self.smtp_password = app.config.get('SMTP_PASSWORD')
        self.from_email = app.config.get('FROM_EMAIL', 'noreply@chordme.com')
        self.use_tls = app.config.get('SMTP_USE_TLS', True)
        
    def send_email(self, to_email, subject, html_content, text_content=None):
        """Send an email with HTML and optional text content."""
        if not self.smtp_server:
            logger.warning("SMTP not configured, skipping email send")
            return False
            
        try:
            msg = MimeMultipart('alternative')
            msg['Subject'] = subject
            msg['From'] = self.from_email
            msg['To'] = to_email
            
            if text_content:
                text_part = MimeText(text_content, 'plain')
                msg.attach(text_part)
                
            html_part = MimeText(html_content, 'html')
            msg.attach(html_part)
            
            with smtplib.SMTP(self.smtp_server, self.smtp_port) as server:
                if self.use_tls:
                    server.starttls()
                if self.smtp_username and self.smtp_password:
                    server.login(self.smtp_username, self.smtp_password)
                server.send_message(msg)
                
            logger.info(f"Email sent successfully to {to_email}")
            return True
            
        except Exception as e:
            logger.error(f"Failed to send email to {to_email}: {str(e)}")
            return False
    
    def send_welcome_email(self, user):
        """Send welcome email to new users."""
        subject = "Welcome to ChordMe! 🎵"
        
        html_content = f"""
        <html>
        <body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="text-align: center; margin-bottom: 30px;">
                <h1 style="color: #3B82F6;">Welcome to ChordMe! 🎵</h1>
            </div>
            
            <p>Hi there,</p>
            
            <p>Welcome to ChordMe, the best platform for managing your songs and chords! We're excited to have you join our community of musicians.</p>
            
            <div style="background-color: #F3F4F6; padding: 20px; border-radius: 8px; margin: 20px 0;">
                <h3 style="color: #374151; margin-top: 0;">Get Started:</h3>
                <ul style="color: #6B7280;">
                    <li>Create your first song using our ChordPro editor</li>
                    <li>Explore the practice mode features</li>
                    <li>Join our community forum</li>
                    <li>Complete daily challenges to earn points</li>
                </ul>
            </div>
            
            <div style="text-align: center; margin: 30px 0;">
                <a href="{current_app.config.get('BASE_URL', 'https://chordme.com')}" 
                   style="background-color: #3B82F6; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
                    Start Creating Music
                </a>
            </div>
            
            <p>If you have any questions, feel free to reach out to our support team.</p>
            
            <p>Happy music making!<br>
            The ChordMe Team</p>
        </body>
        </html>
        """
        
        text_content = f"""
        Welcome to ChordMe!
        
        Hi there,
        
        Welcome to ChordMe, the best platform for managing your songs and chords! We're excited to have you join our community of musicians.
        
        Get Started:
        - Create your first song using our ChordPro editor
        - Explore the practice mode features
        - Join our community forum
        - Complete daily challenges to earn points
        
        Visit ChordMe: {current_app.config.get('BASE_URL', 'https://chordme.com')}
        
        If you have any questions, feel free to reach out to our support team.
        
        Happy music making!
        The ChordMe Team
        """
        
        return self.send_email(user.email, subject, html_content, text_content)
    
    def send_onboarding_reminder(self, user, progress):
        """Send reminder email for incomplete onboarding."""
        completion_percentage = int(progress.completion_percentage)
        
        subject = f"Complete your ChordMe setup - {completion_percentage}% done!"
        
        # Determine next step
        next_steps = []
        if not progress.profile_completed:
            next_steps.append("Complete your profile")
        elif not progress.first_song_created:
            next_steps.append("Create your first song")
        elif not progress.tutorial_completed:
            next_steps.append("Complete the interactive tutorial")
        
        html_content = f"""
        <html>
        <body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="text-align: center; margin-bottom: 30px;">
                <h1 style="color: #3B82F6;">You're {completion_percentage}% done! 🎯</h1>
            </div>
            
            <p>Hi there,</p>
            
            <p>You're making great progress setting up your ChordMe account! Just a few more steps to unlock the full experience.</p>
            
            <div style="background-color: #F3F4F6; padding: 20px; border-radius: 8px; margin: 20px 0;">
                <h3 style="color: #374151; margin-top: 0;">Next Steps:</h3>
                <ul style="color: #6B7280;">
                    {''.join(f'<li>{step}</li>' for step in next_steps)}
                </ul>
            </div>
            
            <div style="text-align: center; margin: 30px 0;">
                <a href="{current_app.config.get('BASE_URL', 'https://chordme.com')}" 
                   style="background-color: #10B981; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
                    Continue Setup
                </a>
            </div>
            
            <p>Need help? Our community is here to support you!</p>
            
            <p>Best regards,<br>
            The ChordMe Team</p>
        </body>
        </html>
        """
        
        return self.send_email(user.email, subject, html_content)
    
    def send_streak_celebration(self, user, streak_days):
        """Send celebration email for streak milestones."""
        subject = f"🔥 Amazing! {streak_days}-day streak on ChordMe!"
        
        milestone_messages = {
            3: "You're building a great habit!",
            7: "One week of consistent practice!",
            14: "Two weeks of dedication!",
            30: "A full month of musical growth!",
            100: "You're a ChordMe legend!"
        }
        
        message = milestone_messages.get(streak_days, "Keep the momentum going!")
        
        html_content = f"""
        <html>
        <body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="text-align: center; margin-bottom: 30px;">
                <h1 style="color: #EF4444;">🔥 {streak_days}-Day Streak! 🔥</h1>
                <h2 style="color: #374151;">{message}</h2>
            </div>
            
            <p>Congratulations! You've maintained a {streak_days}-day activity streak on ChordMe. Your dedication to music is inspiring!</p>
            
            <div style="background-color: #FEF3C7; padding: 20px; border-radius: 8px; margin: 20px 0; text-align: center;">
                <h3 style="color: #92400E; margin-top: 0;">Keep it going!</h3>
                <p style="color: #92400E;">Complete today's challenges to extend your streak</p>
            </div>
            
            <div style="text-align: center; margin: 30px 0;">
                <a href="{current_app.config.get('BASE_URL', 'https://chordme.com')}" 
                   style="background-color: #EF4444; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
                    Continue Your Streak
                </a>
            </div>
            
            <p>Share your achievement with friends and inspire them to join ChordMe!</p>
            
            <p>Rock on!<br>
            The ChordMe Team</p>
        </body>
        </html>
        """
        
        return self.send_email(user.email, subject, html_content)
    
    def send_daily_challenge_reminder(self, user, challenges):
        """Send reminder about today's daily challenges."""
        subject = "🎯 Today's ChordMe Challenges Are Waiting!"
        
        challenge_list = []
        for challenge in challenges:
            challenge_list.append(f"• {challenge.title} ({challenge.points_reward} points)")
        
        html_content = f"""
        <html>
        <body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="text-align: center; margin-bottom: 30px;">
                <h1 style="color: #8B5CF6;">🎯 Daily Challenges</h1>
            </div>
            
            <p>Don't miss out on today's challenges! Earn points and improve your skills.</p>
            
            <div style="background-color: #F3F4F6; padding: 20px; border-radius: 8px; margin: 20px 0;">
                <h3 style="color: #374151; margin-top: 0;">Today's Challenges:</h3>
                <div style="color: #6B7280;">
                    {'<br>'.join(challenge_list)}
                </div>
            </div>
            
            <div style="text-align: center; margin: 30px 0;">
                <a href="{current_app.config.get('BASE_URL', 'https://chordme.com')}" 
                   style="background-color: #8B5CF6; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
                    Start Challenges
                </a>
            </div>
            
            <p>Complete challenges to earn points, unlock badges, and level up your reputation!</p>
            
            <p>Happy practicing!<br>
            The ChordMe Team</p>
        </body>
        </html>
        """
        
        return self.send_email(user.email, subject, html_content)
    
    def send_referral_success_notification(self, referrer, referred_user, reward_points):
        """Send notification when a referral is completed."""
        subject = f"🎉 Your referral joined ChordMe! +{reward_points} points"
        
        html_content = f"""
        <html>
        <body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="text-align: center; margin-bottom: 30px;">
                <h1 style="color: #10B981;">🎉 Referral Success!</h1>
            </div>
            
            <p>Great news! Someone used your referral code to join ChordMe, and you've earned {reward_points} points!</p>
            
            <div style="background-color: #D1FAE5; padding: 20px; border-radius: 8px; margin: 20px 0; text-align: center;">
                <h3 style="color: #065F46; margin-top: 0;">Reward Earned</h3>
                <p style="color: #065F46; font-size: 24px; font-weight: bold;">+{reward_points} Points</p>
            </div>
            
            <p>Keep sharing ChordMe with your friends and earn more rewards!</p>
            
            <div style="text-align: center; margin: 30px 0;">
                <a href="{current_app.config.get('BASE_URL', 'https://chordme.com')}/referrals" 
                   style="background-color: #10B981; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
                    Generate More Codes
                </a>
            </div>
            
            <p>Thank you for helping ChordMe grow!</p>
            
            <p>Best regards,<br>
            The ChordMe Team</p>
        </body>
        </html>
        """
        
        return self.send_email(referrer.email, subject, html_content)


# Initialize email service
email_service = EmailMarketingService()


@app.route('/api/v1/growth/email/test', methods=['POST'])
def test_email():
    """Test endpoint for email functionality (admin only)."""
    from flask import request, jsonify
    from .utils import auth_required, create_success_response, create_error_response
    
    @auth_required
    def send_test():
        try:
            data = request.get_json()
            email = data.get('email')
            
            if not email:
                return create_error_response("Email is required", 400)
            
            # Send test email
            subject = "ChordMe Email Test"
            html_content = """
            <html>
            <body style="font-family: Arial, sans-serif;">
                <h1>Email Test Successful!</h1>
                <p>If you received this email, the ChordMe email system is working correctly.</p>
            </body>
            </html>
            """
            
            success = email_service.send_email(email, subject, html_content)
            
            if success:
                return create_success_response(message="Test email sent successfully")
            else:
                return create_error_response("Failed to send test email", 500)
                
        except Exception as e:
            logger.error(f"Error sending test email: {str(e)}")
            return create_error_response("Failed to send test email", 500)
    
    return send_test()


def send_scheduled_campaigns():
    """Function to be called by scheduled tasks for email campaigns."""
    try:
        # Send onboarding reminders (users who haven't completed onboarding in 3 days)
        three_days_ago = datetime.utcnow() - timedelta(days=3)
        incomplete_users = User.query.join(UserOnboardingProgress).filter(
            UserOnboardingProgress.onboarding_completed == False,
            UserOnboardingProgress.started_at <= three_days_ago,
            UserOnboardingProgress.updated_at <= three_days_ago - timedelta(hours=24)  # Not updated in last 24h
        ).all()
        
        for user in incomplete_users:
            email_service.send_onboarding_reminder(user, user.onboarding_progress)
            
        # Send daily challenge reminders (active users who haven't completed today's challenges)
        today = date.today()
        today_challenges = DailyChallenge.query.filter_by(
            challenge_date=today,
            is_active=True
        ).all()
        
        if today_challenges:
            # Get users who logged in in the last 7 days but haven't completed today's challenges
            week_ago = datetime.utcnow() - timedelta(days=7)
            active_users = User.query.filter(
                User.updated_at >= week_ago  # Assuming updated_at tracks last activity
            ).all()
            
            for user in active_users:
                # Check if user has completed any challenge today
                completed_today = UserChallengeProgress.query.join(DailyChallenge).filter(
                    UserChallengeProgress.user_id == user.id,
                    DailyChallenge.challenge_date == today,
                    UserChallengeProgress.is_completed == True
                ).first()
                
                if not completed_today:
                    email_service.send_daily_challenge_reminder(user, today_challenges)
        
        logger.info("Scheduled email campaigns sent successfully")
        
    except Exception as e:
        logger.error(f"Error sending scheduled campaigns: {str(e)}")


# CLI command for sending campaigns
@app.cli.command('send-campaigns')
def send_campaigns_command():
    """CLI command to send scheduled email campaigns."""
    send_scheduled_campaigns()
    print("Email campaigns sent successfully!")