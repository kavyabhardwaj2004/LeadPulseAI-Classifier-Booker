import os
import uuid
from datetime import datetime, timedelta, timezone
from typing import Dict, Any, Optional
from googleapiclient.discovery import build
from googleapiclient.errors import HttpError
from backend.services.gmail_svc import get_credentials
from backend.config import get_settings

settings = get_settings()

def book_meeting(
    tenant_id: str,
    lead_name: str,
    lead_email: str,
    preferred_time_str: str,
    duration_minutes: int = 45
) -> Dict[str, Any]:
    """Books a meeting via Google Calendar. Returns event_id and meeting_link."""
    creds = get_credentials()
    
    # Always use UTC-aware now
    now = datetime.now(timezone.utc)
    # Mock parse or fallback to +24 hours
    start_time = now + timedelta(days=1)
    
    # Try parsing format from leads.json if possible, e.g. "Fri 3pm GMT", "2026-02-18T03:07:04Z"
    if preferred_time_str:
        try:
            if "T" in preferred_time_str:
                # Parse as naive UTC datetime for comparison
                parsed_naive = datetime.fromisoformat(preferred_time_str.replace("Z", ""))
                now_naive = datetime.utcnow()
                if parsed_naive > now_naive:
                    start_time = parsed_naive  # Use naive UTC for Google API
                else:
                    print(f"Preferred time {preferred_time_str} is in the past. Defaulting to tomorrow.")
                    start_time = now_naive + timedelta(days=1)
        except Exception:
            pass
    else:
        start_time = datetime.utcnow() + timedelta(days=1)
            
    end_time = start_time + timedelta(minutes=duration_minutes)
    
    # Format as RFC3339 without microseconds for Google Calendar API
    start_iso = start_time.strftime("%Y-%m-%dT%H:%M:%S") + "Z"
    end_iso = end_time.strftime("%Y-%m-%dT%H:%M:%S") + "Z"
    
    if not creds:
        # Mock booking for MVP demo if no credentials
        mock_event_id = f"mock_cal_{uuid.uuid4().hex[:10]}"
        mock_link = f"https://meet.google.com/{uuid.uuid4().hex[:3]}-{uuid.uuid4().hex[:4]}-{uuid.uuid4().hex[:3]}"
        return {
            "event_id": mock_event_id,
            "meeting_link": mock_link,
            "meeting_time": start_iso,
            "success": True,
            "note": "Mock event created (Google OAuth not active)"
        }
        
    try:
        service = build("calendar", "v3", credentials=creds)
        
        event = {
            "summary": f"Intro Call: {lead_name} x LeadPulse Agent",
            "description": f"Lead qualification meeting. Lead email: {lead_email}",
            "start": {
                "dateTime": start_iso,
                "timeZone": "UTC",
            },
            "end": {
                "dateTime": end_iso,
                "timeZone": "UTC",
            },
            "attendees": [
                {"email": lead_email},
                {"email": settings.OWNER_EMAIL, "responseStatus": "accepted"},  # Always invite owner
            ],
            "conferenceData": {
                "createRequest": {
                    "requestId": uuid.uuid4().hex,
                    "conferenceSolutionKey": {"type": "hangoutsMeet"}
                }
            }
        }
        
        created_event = service.events().insert(
            calendarId="primary",
            body=event,
            conferenceDataVersion=1
        ).execute()
        
        event_id = created_event.get("id")
        meeting_link = created_event.get("hangoutLink")
        
        # If no hangoutLink, generate fallback
        if not meeting_link:
            meeting_link = f"https://meet.google.com/{uuid.uuid4().hex[:3]}-{uuid.uuid4().hex[:4]}-{uuid.uuid4().hex[:3]}"
            
        return {
            "event_id": event_id,
            "meeting_link": meeting_link,
            "meeting_time": start_iso,
            "success": True
        }
        
    except HttpError as error:
        print(f"Calendar booking error: {error}")
        # Fallback to mock
        return {
            "event_id": f"fallback_cal_{uuid.uuid4().hex[:10]}",
            "meeting_link": f"https://meet.google.com/abc-defg-hij",
            "meeting_time": start_iso,
            "success": False,
            "error": str(error)
        }
