import os
import base64
from typing import Optional
from email.mime.text import MIMEText
from google.auth.transport.requests import Request
from google.oauth2.credentials import Credentials
from google_auth_oauthlib.flow import InstalledAppFlow
from googleapiclient.discovery import build
from googleapiclient.errors import HttpError
from config import get_settings

settings = get_settings()
TOKEN_PATH = os.path.join(settings.PARENT_DIR, "token.json")

def get_credentials() -> Optional[Credentials]:
    """Retrieves Google OAuth credentials from token.json if it exists."""
    if not os.path.exists(TOKEN_PATH):
        return None
        
    try:
        creds = Credentials.from_authorized_user_file(TOKEN_PATH)
        if creds and creds.expired and creds.refresh_token:
            creds.refresh(Request())
            # Save updated credentials
            with open(TOKEN_PATH, "w") as token:
                token.write(creds.to_json())
        return creds
    except Exception as e:
        print(f"Error loading credentials: {e}")
        return None

def list_new_emails(max_results: int = 10) -> list:
    """Lists unread messages in the inbox."""
    creds = get_credentials()
    if not creds:
        print("Gmail service: No credentials available.")
        return []
        
    try:
        service = build("gmail", "v1", credentials=creds)
        # Query for unread messages in INBOX
        results = service.users().messages().list(
            userId="me", labelIds=["UNREAD", "INBOX"], maxResults=max_results
        ).execute()
        
        return results.get("messages", [])
    except HttpError as error:
        print(f"Gmail list_new_emails error: {error}")
        return []

def get_email_body(msg_id: str) -> Optional[dict]:
    """Retrieves the body and metadata of an email by message ID."""
    creds = get_credentials()
    if not creds:
        return None
        
    try:
        service = build("gmail", "v1", credentials=creds)
        message = service.users().messages().get(userId="me", id=msg_id, format="full").execute()
        
        headers = message.get("payload", {}).get("headers", [])
        subject = ""
        sender = ""
        for h in headers:
            if h.get("name").lower() == "subject":
                subject = h.get("value")
            elif h.get("name").lower() == "from":
                sender = h.get("value")
                
        body = ""
        payload = message.get("payload", {})
        
        # Helper to decode parts
        def parse_parts(parts):
            text = ""
            for part in parts:
                mime_type = part.get("mimeType")
                body_data = part.get("body", {}).get("data")
                if mime_type == "text/plain" and body_data:
                    text += base64.urlsafe_b64decode(body_data).decode("utf-8")
                elif mime_type == "text/html" and body_data:
                    # Fallback if no plain text, but prefer plain
                    if not text:
                        text += base64.urlsafe_b64decode(body_data).decode("utf-8")
                elif part.get("parts"):
                    text += parse_parts(part.get("parts"))
            return text
            
        if payload.get("parts"):
            body = parse_parts(payload.get("parts"))
        else:
            body_data = payload.get("body", {}).get("data")
            if body_data:
                body = base64.urlsafe_b64decode(body_data).decode("utf-8")
                
        return {
            "id": msg_id,
            "threadId": message.get("threadId"),
            "subject": subject,
            "from": sender,
            "body": body
        }
    except HttpError as error:
        print(f"Gmail get_email_body error: {error}")
        return None

def send_email(to: str, subject: str, body: str, thread_id: str = None) -> bool:
    """Sends an email. Optionally replies to a thread."""
    creds = get_credentials()
    if not creds:
        print("Gmail send_email: No credentials. Printing email instead:")
        print(f"--- OUTBOUND EMAIL TO {to} ---")
        print(f"Subject: {subject}")
        print(body)
        print("-------------------------------")
        return False
        
    try:
        service = build("gmail", "v1", credentials=creds)
        message = MIMEText(body)
        message["to"] = to
        message["subject"] = subject
        
        raw = base64.urlsafe_b64encode(message.as_bytes()).decode("utf-8")
        msg_body = {"raw": raw}
        if thread_id:
            msg_body["threadId"] = thread_id
            
        service.users().messages().send(userId="me", body=msg_body).execute()
        return True
    except HttpError as error:
        print(f"Gmail send_email error: {error}")
        return False

def save_draft(to: str, subject: str, body: str) -> bool:
    """Creates a draft email in Gmail."""
    creds = get_credentials()
    if not creds:
        print("Gmail save_draft: No credentials. Printing draft instead:")
        print(f"--- DRAFT EMAIL FOR {to} ---")
        print(f"Subject: {subject}")
        print(body)
        print("----------------------------")
        return False
        
    try:
        service = build("gmail", "v1", credentials=creds)
        message = MIMEText(body)
        message["to"] = to
        message["subject"] = subject
        
        raw = base64.urlsafe_b64encode(message.as_bytes()).decode("utf-8")
        draft_body = {"message": {"raw": raw}}
        
        service.users().drafts().create(userId="me", body=draft_body).execute()
        return True
    except HttpError as error:
        print(f"Gmail save_draft error: {error}")
        return False
