"""
Calendar integration service for professional collaboration workspaces.
Supports Google Calendar and Outlook calendar integration.
"""

import logging
from datetime import datetime, timedelta
from typing import Optional, Dict, List, Any
from google.oauth2.credentials import Credentials
from google.auth.transport.requests import Request
from googleapiclient.discovery import build
from googleapiclient.errors import HttpError
import requests
import json

logger = logging.getLogger(__name__)


class CalendarIntegrationService:
    """Service for integrating with external calendar systems."""
    
    def __init__(self):
        self.google_service = None
        self.outlook_service = None
    
    def setup_google_calendar(self, credentials_dict: Dict[str, Any]) -> bool:
        """
        Setup Google Calendar integration with user credentials.
        
        Args:
            credentials_dict: Dictionary containing Google OAuth2 credentials
            
        Returns:
            bool: True if setup successful, False otherwise
        """
        try:
            credentials = Credentials.from_authorized_user_info(credentials_dict)
            
            # Refresh credentials if needed
            if credentials.expired and credentials.refresh_token:
                credentials.refresh(Request())
            
            self.google_service = build('calendar', 'v3', credentials=credentials)
            return True
            
        except Exception as e:
            logger.error(f"Failed to setup Google Calendar: {str(e)}")
            return False
    
    def setup_outlook_calendar(self, access_token: str) -> bool:
        """
        Setup Outlook Calendar integration with access token.
        
        Args:
            access_token: Microsoft Graph API access token
            
        Returns:
            bool: True if setup successful, False otherwise
        """
        try:
            # Test the token with a simple API call
            headers = {
                'Authorization': f'Bearer {access_token}',
                'Content-Type': 'application/json'
            }
            
            response = requests.get(
                'https://graph.microsoft.com/v1.0/me/calendars',
                headers=headers,
                timeout=10
            )
            
            if response.status_code == 200:
                self.outlook_access_token = access_token
                return True
            
            return False
            
        except Exception as e:
            logger.error(f"Failed to setup Outlook Calendar: {str(e)}")
            return False
    
    def create_google_calendar_event(
        self, 
        meeting_data: Dict[str, Any],
        attendee_emails: List[str] = None
    ) -> Optional[str]:
        """
        Create an event in Google Calendar.
        
        Args:
            meeting_data: Dictionary containing meeting information
            attendee_emails: List of attendee email addresses
            
        Returns:
            str: Google Calendar event ID if successful, None otherwise
        """
        if not self.google_service:
            logger.error("Google Calendar service not initialized")
            return None
        
        try:
            # Prepare event data
            event = {
                'summary': meeting_data['title'],
                'description': meeting_data.get('description', ''),
                'start': {
                    'dateTime': meeting_data['scheduled_at'].isoformat(),
                    'timeZone': meeting_data.get('timezone', 'UTC'),
                },
                'end': {
                    'dateTime': (
                        meeting_data['scheduled_at'] + 
                        timedelta(minutes=meeting_data.get('duration_minutes', 60))
                    ).isoformat(),
                    'timeZone': meeting_data.get('timezone', 'UTC'),
                },
                'location': meeting_data.get('location', ''),
                'conferenceData': {
                    'createRequest': {
                        'requestId': f"chordme-{meeting_data.get('id', 'meeting')}",
                        'conferenceSolutionKey': {'type': 'hangoutsMeet'}
                    }
                } if meeting_data.get('create_meet_link') else {},
                'reminders': {
                    'useDefault': False,
                    'overrides': [
                        {'method': 'email', 'minutes': 24 * 60},  # 24 hours
                        {'method': 'popup', 'minutes': 30},       # 30 minutes
                    ],
                },
            }
            
            # Add attendees
            if attendee_emails:
                event['attendees'] = [{'email': email} for email in attendee_emails]
            
            # Add meeting URL if provided
            if meeting_data.get('meeting_url'):
                event['description'] += f"\n\nJoin meeting: {meeting_data['meeting_url']}"
            
            # Create event
            created_event = self.google_service.events().insert(
                calendarId='primary',
                body=event,
                conferenceDataVersion=1 if meeting_data.get('create_meet_link') else 0,
                sendUpdates='all'
            ).execute()
            
            logger.info(f"Google Calendar event created: {created_event['id']}")
            return created_event['id']
            
        except HttpError as e:
            logger.error(f"Google Calendar API error: {str(e)}")
            return None
        except Exception as e:
            logger.error(f"Failed to create Google Calendar event: {str(e)}")
            return None
    
    def create_outlook_calendar_event(
        self,
        meeting_data: Dict[str, Any],
        attendee_emails: List[str] = None
    ) -> Optional[str]:
        """
        Create an event in Outlook Calendar.
        
        Args:
            meeting_data: Dictionary containing meeting information
            attendee_emails: List of attendee email addresses
            
        Returns:
            str: Outlook Calendar event ID if successful, None otherwise
        """
        if not hasattr(self, 'outlook_access_token'):
            logger.error("Outlook Calendar service not initialized")
            return None
        
        try:
            headers = {
                'Authorization': f'Bearer {self.outlook_access_token}',
                'Content-Type': 'application/json'
            }
            
            # Prepare event data
            event_data = {
                'subject': meeting_data['title'],
                'body': {
                    'contentType': 'HTML',
                    'content': meeting_data.get('description', '')
                },
                'start': {
                    'dateTime': meeting_data['scheduled_at'].isoformat(),
                    'timeZone': meeting_data.get('timezone', 'UTC')
                },
                'end': {
                    'dateTime': (
                        meeting_data['scheduled_at'] + 
                        timedelta(minutes=meeting_data.get('duration_minutes', 60))
                    ).isoformat(),
                    'timeZone': meeting_data.get('timezone', 'UTC')
                },
                'location': {
                    'displayName': meeting_data.get('location', '')
                },
                'reminderMinutesBeforeStart': 30,
                'isReminderOn': True
            }
            
            # Add attendees
            if attendee_emails:
                event_data['attendees'] = [
                    {
                        'emailAddress': {'address': email, 'name': email},
                        'type': 'required'
                    }
                    for email in attendee_emails
                ]
            
            # Add meeting URL if provided
            if meeting_data.get('meeting_url'):
                event_data['body']['content'] += f"<br><br>Join meeting: <a href='{meeting_data['meeting_url']}'>{meeting_data['meeting_url']}</a>"
            
            # Create event
            response = requests.post(
                'https://graph.microsoft.com/v1.0/me/events',
                headers=headers,
                json=event_data,
                timeout=30
            )
            
            if response.status_code == 201:
                event = response.json()
                logger.info(f"Outlook Calendar event created: {event['id']}")
                return event['id']
            else:
                logger.error(f"Outlook Calendar API error: {response.status_code} - {response.text}")
                return None
            
        except Exception as e:
            logger.error(f"Failed to create Outlook Calendar event: {str(e)}")
            return None
    
    def update_google_calendar_event(
        self,
        event_id: str,
        meeting_data: Dict[str, Any],
        attendee_emails: List[str] = None
    ) -> bool:
        """
        Update an existing Google Calendar event.
        
        Args:
            event_id: Google Calendar event ID
            meeting_data: Updated meeting information
            attendee_emails: Updated list of attendee emails
            
        Returns:
            bool: True if update successful, False otherwise
        """
        if not self.google_service:
            logger.error("Google Calendar service not initialized")
            return False
        
        try:
            # Get existing event
            event = self.google_service.events().get(
                calendarId='primary',
                eventId=event_id
            ).execute()
            
            # Update event data
            event['summary'] = meeting_data['title']
            event['description'] = meeting_data.get('description', '')
            event['start'] = {
                'dateTime': meeting_data['scheduled_at'].isoformat(),
                'timeZone': meeting_data.get('timezone', 'UTC'),
            }
            event['end'] = {
                'dateTime': (
                    meeting_data['scheduled_at'] + 
                    timedelta(minutes=meeting_data.get('duration_minutes', 60))
                ).isoformat(),
                'timeZone': meeting_data.get('timezone', 'UTC'),
            }
            event['location'] = meeting_data.get('location', '')
            
            # Update attendees
            if attendee_emails:
                event['attendees'] = [{'email': email} for email in attendee_emails]
            
            # Update event
            updated_event = self.google_service.events().update(
                calendarId='primary',
                eventId=event_id,
                body=event,
                sendUpdates='all'
            ).execute()
            
            logger.info(f"Google Calendar event updated: {updated_event['id']}")
            return True
            
        except HttpError as e:
            logger.error(f"Google Calendar API error: {str(e)}")
            return False
        except Exception as e:
            logger.error(f"Failed to update Google Calendar event: {str(e)}")
            return False
    
    def update_outlook_calendar_event(
        self,
        event_id: str,
        meeting_data: Dict[str, Any],
        attendee_emails: List[str] = None
    ) -> bool:
        """
        Update an existing Outlook Calendar event.
        
        Args:
            event_id: Outlook Calendar event ID
            meeting_data: Updated meeting information
            attendee_emails: Updated list of attendee emails
            
        Returns:
            bool: True if update successful, False otherwise
        """
        if not hasattr(self, 'outlook_access_token'):
            logger.error("Outlook Calendar service not initialized")
            return False
        
        try:
            headers = {
                'Authorization': f'Bearer {self.outlook_access_token}',
                'Content-Type': 'application/json'
            }
            
            # Prepare updated event data
            event_data = {
                'subject': meeting_data['title'],
                'body': {
                    'contentType': 'HTML',
                    'content': meeting_data.get('description', '')
                },
                'start': {
                    'dateTime': meeting_data['scheduled_at'].isoformat(),
                    'timeZone': meeting_data.get('timezone', 'UTC')
                },
                'end': {
                    'dateTime': (
                        meeting_data['scheduled_at'] + 
                        timedelta(minutes=meeting_data.get('duration_minutes', 60))
                    ).isoformat(),
                    'timeZone': meeting_data.get('timezone', 'UTC')
                },
                'location': {
                    'displayName': meeting_data.get('location', '')
                }
            }
            
            # Update attendees
            if attendee_emails:
                event_data['attendees'] = [
                    {
                        'emailAddress': {'address': email, 'name': email},
                        'type': 'required'
                    }
                    for email in attendee_emails
                ]
            
            # Update event
            response = requests.patch(
                f'https://graph.microsoft.com/v1.0/me/events/{event_id}',
                headers=headers,
                json=event_data,
                timeout=30
            )
            
            if response.status_code == 200:
                logger.info(f"Outlook Calendar event updated: {event_id}")
                return True
            else:
                logger.error(f"Outlook Calendar API error: {response.status_code} - {response.text}")
                return False
            
        except Exception as e:
            logger.error(f"Failed to update Outlook Calendar event: {str(e)}")
            return False
    
    def delete_google_calendar_event(self, event_id: str) -> bool:
        """
        Delete a Google Calendar event.
        
        Args:
            event_id: Google Calendar event ID
            
        Returns:
            bool: True if deletion successful, False otherwise
        """
        if not self.google_service:
            logger.error("Google Calendar service not initialized")
            return False
        
        try:
            self.google_service.events().delete(
                calendarId='primary',
                eventId=event_id,
                sendUpdates='all'
            ).execute()
            
            logger.info(f"Google Calendar event deleted: {event_id}")
            return True
            
        except HttpError as e:
            logger.error(f"Google Calendar API error: {str(e)}")
            return False
        except Exception as e:
            logger.error(f"Failed to delete Google Calendar event: {str(e)}")
            return False
    
    def delete_outlook_calendar_event(self, event_id: str) -> bool:
        """
        Delete an Outlook Calendar event.
        
        Args:
            event_id: Outlook Calendar event ID
            
        Returns:
            bool: True if deletion successful, False otherwise
        """
        if not hasattr(self, 'outlook_access_token'):
            logger.error("Outlook Calendar service not initialized")
            return False
        
        try:
            headers = {
                'Authorization': f'Bearer {self.outlook_access_token}',
                'Content-Type': 'application/json'
            }
            
            response = requests.delete(
                f'https://graph.microsoft.com/v1.0/me/events/{event_id}',
                headers=headers,
                timeout=30
            )
            
            if response.status_code == 204:
                logger.info(f"Outlook Calendar event deleted: {event_id}")
                return True
            else:
                logger.error(f"Outlook Calendar API error: {response.status_code} - {response.text}")
                return False
            
        except Exception as e:
            logger.error(f"Failed to delete Outlook Calendar event: {str(e)}")
            return False
    
    def generate_ical_content(self, meeting_data: Dict[str, Any]) -> str:
        """
        Generate iCal content for cross-platform calendar compatibility.
        
        Args:
            meeting_data: Dictionary containing meeting information
            
        Returns:
            str: iCal formatted content
        """
        try:
            start_time = meeting_data['scheduled_at']
            end_time = start_time + timedelta(minutes=meeting_data.get('duration_minutes', 60))
            
            # Format times for iCal (UTC)
            start_utc = start_time.strftime('%Y%m%dT%H%M%SZ')
            end_utc = end_time.strftime('%Y%m%dT%H%M%SZ')
            created_utc = datetime.utcnow().strftime('%Y%m%dT%H%M%SZ')
            
            # Generate unique UID
            uid = f"chordme-meeting-{meeting_data.get('id', 'unknown')}@chordme.app"
            
            ical_content = f"""BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//ChordMe//Professional Collaboration//EN
CALSCALE:GREGORIAN
METHOD:REQUEST
BEGIN:VEVENT
UID:{uid}
DTSTAMP:{created_utc}
DTSTART:{start_utc}
DTEND:{end_utc}
SUMMARY:{meeting_data['title']}
DESCRIPTION:{meeting_data.get('description', '')}
LOCATION:{meeting_data.get('location', '')}
STATUS:CONFIRMED
SEQUENCE:0
BEGIN:VALARM
TRIGGER:-PT30M
ACTION:DISPLAY
DESCRIPTION:Meeting reminder
END:VALARM
END:VEVENT
END:VCALENDAR"""
            
            return ical_content
            
        except Exception as e:
            logger.error(f"Failed to generate iCal content: {str(e)}")
            return ""


# Global service instance
calendar_service = CalendarIntegrationService()


def get_calendar_service() -> CalendarIntegrationService:
    """Get the global calendar service instance."""
    return calendar_service