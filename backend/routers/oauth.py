import os
from fastapi import APIRouter, Request, HTTPException
from fastapi.responses import RedirectResponse
from google_auth_oauthlib.flow import Flow
from googleapiclient.discovery import build
from backend.config import get_settings
from backend.services.gmail_svc import TOKEN_PATH

settings = get_settings()
router = APIRouter(prefix="/oauth", tags=["OAuth"])

SCOPES = [
    "https://www.googleapis.com/auth/gmail.modify",
    "https://www.googleapis.com/auth/calendar.events"
]

def get_oauth_flow() -> Flow:
    """Constructs Flow object using credentials from settings."""
    client_config = {
        "web": {
            "client_id": settings.GOOGLE_CLIENT_ID,
            "client_secret": settings.GOOGLE_CLIENT_SECRET,
            "auth_uri": "https://accounts.google.com/o/oauth2/auth",
            "token_uri": "https://oauth2.googleapis.com/token"
        }
    }
    flow = Flow.from_client_config(
        client_config,
        scopes=SCOPES,
        redirect_uri=settings.GOOGLE_REDIRECT_URI
    )
    return flow

@router.get("/start")
def start_oauth():
    """Generates Google OAuth URL and returns it to the client."""
    try:
        flow = get_oauth_flow()
        authorization_url, state = flow.authorization_url(
            access_type="offline",
            include_granted_scopes="true",
            prompt="consent"
        )
        return {"url": authorization_url}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to initiate OAuth flow: {str(e)}")

@router.get("/callback")
def oauth_callback(code: str, state: str = None):
    """Callback handler where Google redirects after authorization."""
    try:
        flow = get_oauth_flow()
        flow.fetch_token(code=code)
        
        credentials = flow.credentials
        
        # Save credentials for future use
        with open(TOKEN_PATH, "w") as token_file:
            token_file.write(credentials.to_json())
            
        # Redirect back to frontend homepage (or dashboard)
        # Assuming frontend runs on localhost:5173
        return RedirectResponse(url="http://localhost:5173/?oauth=success")
    except Exception as e:
        return RedirectResponse(url=f"http://localhost:5173/?oauth=error&msg={str(e)}")

@router.get("/status")
def oauth_status():
    """Returns whether Gmail/Calendar integration is authenticated."""
    authenticated = False
    if os.path.exists(TOKEN_PATH):
        try:
            from backend.services.gmail_svc import get_credentials
            creds = get_credentials()
            if creds and creds.valid:
                authenticated = True
        except Exception:
            pass
            
    return {"connected": authenticated}

@router.post("/revoke")
def oauth_revoke():
    """Revokes OAuth integration by deleting local token file."""
    if os.path.exists(TOKEN_PATH):
        try:
            os.remove(TOKEN_PATH)
            return {"status": "success", "message": "Tokens revoked"}
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Failed to delete token file: {str(e)}")
    return {"status": "success", "message": "No active integration found"}
